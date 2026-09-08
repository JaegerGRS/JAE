from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import httpx

from backend.models.schemas import ModelManifest, ModelSpec


@dataclass
class DownloadJob:
    job_id: str
    model_id: str
    status: str = "queued"
    downloaded_bytes: int = 0
    total_bytes: int = 0
    progress: float = 0.0
    error: str = ""
    cancel_requested: bool = False
    output_path: str = ""
    created_at: str = ""
    updated_at: str = ""


class ModelDownloadManager:
    def __init__(self, models_dir: Path, manifest: ModelManifest, max_concurrent_downloads: int = 1) -> None:
        self.models_dir = models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.manifest = manifest
        self.max_concurrent_downloads = max(1, int(max_concurrent_downloads))
        self.jobs: dict[str, DownloadJob] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._queue: list[str] = []
        self._state_file = self.models_dir / ".download_jobs.json"
        self._load_state()

    def refresh_manifest(self, manifest: ModelManifest) -> None:
        self.manifest = manifest

    def list_model_status(self) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        for model in self.manifest.models:
            target = self.models_dir / model.filename
            exists = target.exists()
            checksum_ok = None
            if exists and model.sha256 and not model.sha256.startswith("REPLACE_"):
                checksum_ok = self._compute_sha256(target) == model.sha256.lower()
            rows.append(
                {
                    "id": model.id,
                    "name": model.name,
                    "filename": model.filename,
                    "exists": exists,
                    "size": target.stat().st_size if exists else 0,
                    "checksum_ok": checksum_ok,
                }
            )
        return rows

    def start_download(self, model_id: str) -> DownloadJob:
        self._find_model(model_id)
        existing = self._find_active_job_for_model(model_id)
        if existing is not None:
            return existing

        job_id = str(uuid.uuid4())
        now = self._utc_now()
        job = DownloadJob(job_id=job_id, model_id=model_id, created_at=now, updated_at=now)
        self.jobs[job_id] = job
        self._queue.append(job_id)
        self._persist_state()
        self._dispatch_queued_jobs()
        return job

    def get_job(self, job_id: str) -> DownloadJob:
        if job_id not in self.jobs:
            raise ValueError(f"Unknown job id: {job_id}")
        return self.jobs[job_id]

    def cancel_job(self, job_id: str) -> DownloadJob:
        job = self.get_job(job_id)
        job.cancel_requested = True
        job.updated_at = self._utc_now()
        if job.status == "queued":
            job.status = "cancelled"
            if job_id in self._queue:
                self._queue.remove(job_id)
        self._persist_state()
        self._dispatch_queued_jobs()
        return job

    def list_jobs(self) -> list[dict[str, object]]:
        return [asdict(job) for job in sorted(self.jobs.values(), key=lambda j: j.created_at, reverse=True)]

    def delete_model(self, model_id: str) -> dict[str, object]:
        model = self._find_model(model_id)
        target = self.models_dir / model.filename
        if target.exists():
            target.unlink()
            return {"deleted": True, "model_id": model_id}
        return {"deleted": False, "model_id": model_id, "message": "file not found"}

    async def _download(self, job: DownloadJob, model: ModelSpec) -> None:
        tmp = self.models_dir / f"{model.filename}.part"
        dest = self.models_dir / model.filename
        existing = tmp.stat().st_size if tmp.exists() else 0

        headers: dict[str, str] = {}
        mode = "wb"
        if existing > 0:
            headers["Range"] = f"bytes={existing}-"
            mode = "ab"
            job.downloaded_bytes = existing

        job.status = "downloading"
        job.updated_at = self._utc_now()
        self._persist_state()
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream("GET", model.download_url, headers=headers, follow_redirects=True) as response:
                    response.raise_for_status()
                    content_len = int(response.headers.get("Content-Length", "0"))
                    if response.status_code == 206 and existing > 0:
                        job.total_bytes = existing + content_len
                    else:
                        job.total_bytes = content_len
                        if mode == "ab" and content_len > 0:
                            mode = "wb"
                            job.downloaded_bytes = 0

                    with tmp.open(mode) as fh:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 128):
                            if job.cancel_requested:
                                job.status = "cancelled"
                                job.updated_at = self._utc_now()
                                self._persist_state()
                                return
                            fh.write(chunk)
                            job.downloaded_bytes += len(chunk)
                            if job.total_bytes > 0:
                                job.progress = round((job.downloaded_bytes / job.total_bytes) * 100, 2)
                            job.updated_at = self._utc_now()
                            self._persist_state()

                if model.sha256 and not model.sha256.startswith("REPLACE_"):
                    digest = self._compute_sha256(tmp)
                    if digest != model.sha256.lower():
                        job.status = "failed"
                        job.error = "checksum mismatch"
                        job.updated_at = self._utc_now()
                        self._persist_state()
                        return

                tmp.replace(dest)
                job.output_path = str(dest)
                job.progress = 100.0
                job.status = "completed"
                job.updated_at = self._utc_now()
                self._persist_state()
            except Exception as exc:
                job.status = "failed"
                job.error = str(exc)
                job.updated_at = self._utc_now()
                self._persist_state()
            finally:
                self._tasks.pop(job.job_id, None)
                self._dispatch_queued_jobs()

    def _find_model(self, model_id: str) -> ModelSpec:
        for model in self.manifest.models:
            if model.id == model_id:
                return model
        raise ValueError(f"Model id not found in manifest: {model_id}")

    def _find_active_job_for_model(self, model_id: str) -> DownloadJob | None:
        for job in self.jobs.values():
            if job.model_id != model_id:
                continue
            if job.status in {"queued", "downloading"}:
                return job
        return None

    def _dispatch_queued_jobs(self) -> None:
        while self._can_start_more() and self._queue:
            job_id = self._queue.pop(0)
            job = self.jobs.get(job_id)
            if job is None:
                continue
            if job.cancel_requested or job.status == "cancelled":
                job.status = "cancelled"
                job.updated_at = self._utc_now()
                self._persist_state()
                continue

            model = self._find_model(job.model_id)
            try:
                task = asyncio.create_task(self._download(job, model))
            except RuntimeError:
                job.status = "queued"
                job.updated_at = self._utc_now()
                if job_id not in self._queue:
                    self._queue.insert(0, job_id)
                self._persist_state()
                return

            self._tasks[job_id] = task
            self._persist_state()

    def _can_start_more(self) -> bool:
        active = sum(1 for t in self._tasks.values() if not t.done())
        return active < self.max_concurrent_downloads

    def _load_state(self) -> None:
        if not self._state_file.exists():
            return
        try:
            raw = json.loads(self._state_file.read_text(encoding="utf-8"))
            jobs_raw = raw.get("jobs", []) if isinstance(raw, dict) else []
            queue_raw = raw.get("queue", []) if isinstance(raw, dict) else []
            for row in jobs_raw:
                if not isinstance(row, dict):
                    continue
                job = DownloadJob(**row)
                if job.status in {"queued", "downloading"}:
                    job.status = "interrupted"
                    job.error = "service restarted before completion"
                self.jobs[job.job_id] = job
            self._queue = [jid for jid in queue_raw if jid in self.jobs and self.jobs[jid].status == "queued"]
        except Exception:
            self.jobs = {}
            self._queue = []

    def _persist_state(self) -> None:
        payload = {
            "max_concurrent_downloads": self.max_concurrent_downloads,
            "queue": self._queue,
            "jobs": [asdict(job) for job in self.jobs.values()],
            "updated_at": self._utc_now(),
        }
        self._state_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    @staticmethod
    def _utc_now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _compute_sha256(self, path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as fh:
            while True:
                block = fh.read(1024 * 1024)
                if not block:
                    break
                h.update(block)
        return h.hexdigest()
