from __future__ import annotations

import asyncio
import hashlib
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import TCPServer

from backend.models.download_manager import ModelDownloadManager
from backend.models.schemas import ModelManifest, ModelSpec


class QuietTCPServer(TCPServer):
    allow_reuse_address = True


def _make_manifest(url: str, sha256: str) -> ModelManifest:
    return ModelManifest(
        models=[
            ModelSpec(
                id="model-test",
                name="Model Test",
                description="test",
                source="local",
                download_url=url,
                filename="model-test.gguf",
                sha256=sha256,
                architecture="test",
                parameter_count="3b",
                quantization="q4",
                required_ram_gb=1,
                recommended_ram_gb=2,
                required_vram_gb=0,
                recommended_vram_gb=0,
                context_limit=2048,
                capabilities=["chat"],
                backend_compatibility=["llamacpp"],
                priority=1,
            )
        ]
    )


def test_model_download_and_checksum(tmp_path: Path) -> None:
    serve_dir = tmp_path / "serve"
    serve_dir.mkdir(parents=True, exist_ok=True)
    content = b"demo model bytes"
    served_file = serve_dir / "model-test.gguf"
    served_file.write_bytes(content)
    checksum = hashlib.sha256(content).hexdigest()

    handler = partial(SimpleHTTPRequestHandler, directory=str(serve_dir))
    server = QuietTCPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        manifest = _make_manifest(f"http://127.0.0.1:{port}/model-test.gguf", checksum)
        manager = ModelDownloadManager(tmp_path / "models", manifest)

        async def run_job() -> str:
            job = manager.start_download("model-test")
            while True:
                current = manager.get_job(job.job_id)
                if current.status in {"completed", "failed", "cancelled"}:
                    return current.status
                await asyncio.sleep(0.05)

        status = asyncio.run(run_job())
        assert status == "completed"

        target = tmp_path / "models" / "model-test.gguf"
        assert target.exists()
        assert target.read_bytes() == content

        rows = manager.list_model_status()
        assert rows[0]["exists"] is True
        assert rows[0]["checksum_ok"] is True
    finally:
        server.shutdown()
        server.server_close()


def test_download_queue_concurrency_and_persistence(tmp_path: Path) -> None:
    serve_dir = tmp_path / "serve2"
    serve_dir.mkdir(parents=True, exist_ok=True)
    content1 = b"model-a-bytes" * 5000
    content2 = b"model-b-bytes" * 5000
    (serve_dir / "model-a.gguf").write_bytes(content1)
    (serve_dir / "model-b.gguf").write_bytes(content2)

    handler = partial(SimpleHTTPRequestHandler, directory=str(serve_dir))
    server = QuietTCPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        manifest = ModelManifest(
            models=[
                ModelSpec(
                    id="a",
                    name="A",
                    description="",
                    source="",
                    download_url=f"http://127.0.0.1:{port}/model-a.gguf",
                    filename="model-a.gguf",
                    sha256=hashlib.sha256(content1).hexdigest(),
                    architecture="",
                    parameter_count="3b",
                    quantization="q4",
                    required_ram_gb=1,
                    recommended_ram_gb=1,
                    required_vram_gb=0,
                    recommended_vram_gb=0,
                    context_limit=2048,
                    capabilities=["chat"],
                    backend_compatibility=["llamacpp"],
                    priority=1,
                ),
                ModelSpec(
                    id="b",
                    name="B",
                    description="",
                    source="",
                    download_url=f"http://127.0.0.1:{port}/model-b.gguf",
                    filename="model-b.gguf",
                    sha256=hashlib.sha256(content2).hexdigest(),
                    architecture="",
                    parameter_count="3b",
                    quantization="q4",
                    required_ram_gb=1,
                    recommended_ram_gb=1,
                    required_vram_gb=0,
                    recommended_vram_gb=0,
                    context_limit=2048,
                    capabilities=["chat"],
                    backend_compatibility=["llamacpp"],
                    priority=1,
                ),
            ]
        )

        manager = ModelDownloadManager(tmp_path / "models2", manifest, max_concurrent_downloads=1)

        async def run_two_jobs() -> None:
            job_a = manager.start_download("a")
            job_b = manager.start_download("b")
            assert job_a.status in {"queued", "downloading"}
            assert job_b.status in {"queued", "downloading"}

            while True:
                current_a = manager.get_job(job_a.job_id)
                current_b = manager.get_job(job_b.job_id)
                done_a = current_a.status in {"completed", "failed", "cancelled"}
                done_b = current_b.status in {"completed", "failed", "cancelled"}
                if done_a and done_b:
                    break
                await asyncio.sleep(0.05)

            assert manager.get_job(job_a.job_id).status == "completed"
            assert manager.get_job(job_b.job_id).status == "completed"

        asyncio.run(run_two_jobs())

        state_file = tmp_path / "models2" / ".download_jobs.json"
        assert state_file.exists()

        interrupted_state = {
            "max_concurrent_downloads": 1,
            "queue": ["j1"],
            "jobs": [
                {
                    "job_id": "j1",
                    "model_id": "a",
                    "status": "queued",
                    "downloaded_bytes": 0,
                    "total_bytes": 0,
                    "progress": 0.0,
                    "error": "",
                    "cancel_requested": False,
                    "output_path": "",
                    "created_at": "2026-01-01T00:00:00+00:00",
                    "updated_at": "2026-01-01T00:00:00+00:00",
                }
            ],
            "updated_at": "2026-01-01T00:00:00+00:00",
        }
        state_file.write_text(json.dumps(interrupted_state), encoding="utf-8")

        manager2 = ModelDownloadManager(tmp_path / "models2", manifest, max_concurrent_downloads=1)
        recovered = manager2.get_job("j1")
        assert recovered.status == "interrupted"
    finally:
        server.shutdown()
        server.server_close()
