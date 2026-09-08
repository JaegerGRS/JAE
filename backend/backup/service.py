from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from cryptography.fernet import Fernet, InvalidToken

from backend.core.config import AppConfig


class BackupError(RuntimeError):
    pass


class BackupService:
    """Creates, verifies, and restores encrypted local backups."""

    def __init__(self, project_root: Path, config: AppConfig) -> None:
        self.project_root = project_root
        self.config = config
        self.data_dir = project_root / config.paths.data_dir
        self.backups_dir = project_root / config.backup.backups_dir
        self.backups_dir.mkdir(parents=True, exist_ok=True)
        self.key_file = project_root / config.backup.key_file
        self.signing_key_file = project_root / config.backup.signing_key_file
        self.export_dir = project_root / config.backup.export_dir
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.restore_dir = self.data_dir / "restore"
        self.restore_dir.mkdir(parents=True, exist_ok=True)

    def list_backups(self) -> list[dict[str, str | int]]:
        rows: list[dict[str, str | int]] = []
        for path in sorted(self.backups_dir.glob("*.jxbak"), reverse=True):
            rows.append(
                {
                    "name": path.name,
                    "size": path.stat().st_size,
                    "modified": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
                }
            )
        return rows

    def create_backup(self, backup_name: str | None = None) -> dict[str, str | int]:
        key = self._load_or_create_key()
        fernet = Fernet(key)

        backup_name = backup_name or f"jae_ai_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        payload = self._build_payload_zip()
        encrypted = fernet.encrypt(payload)

        output = self.backups_dir / f"{backup_name}.jxbak"
        output.write_bytes(encrypted)

        checksum = hashlib.sha256(encrypted).hexdigest()
        meta = {
            "name": output.name,
            "checksum": checksum,
            "size": output.stat().st_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "signature_algorithm": "hmac-sha256",
        }
        meta["signature"] = self._sign_metadata(meta)
        (self.backups_dir / f"{backup_name}.meta.json").write_text(
            json.dumps(meta, indent=2),
            encoding="utf-8",
        )
        return meta

    def verify_backup(self, backup_name: str) -> dict[str, str | bool]:
        path = self.backups_dir / backup_name
        if not path.exists():
            raise BackupError(f"Backup not found: {backup_name}")

        encrypted = path.read_bytes()
        digest = hashlib.sha256(encrypted).hexdigest()

        meta_path = path.with_suffix(".meta.json")
        expected = ""
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            expected = str(meta.get("checksum", ""))

        if expected and expected != digest:
            return {
                "ok": False,
                "message": "checksum mismatch",
                "checksum": digest,
            }

        if meta_path.exists():
            if not self._verify_metadata_signature(json.loads(meta_path.read_text(encoding="utf-8"))):
                return {
                    "ok": False,
                    "message": "metadata signature invalid",
                    "checksum": digest,
                }

        key = self._load_or_create_key()
        fernet = Fernet(key)
        try:
            payload = fernet.decrypt(encrypted)
            with ZipFile(io.BytesIO(payload), "r") as zf:
                zf.testzip()
        except InvalidToken as exc:
            return {"ok": False, "message": f"invalid key/token: {exc}", "checksum": digest}
        except Exception as exc:
            return {"ok": False, "message": f"archive verification failed: {exc}", "checksum": digest}

        return {"ok": True, "message": "backup verified", "checksum": digest}

    def export_backup(self, backup_name: str, destination_subdir: str | None = None) -> dict[str, str | int | bool]:
        verify = self.verify_backup(backup_name)
        if not bool(verify.get("ok", False)):
            raise BackupError(f"Backup export blocked: {verify.get('message', 'verification failed')}")

        source_backup = self.backups_dir / backup_name
        source_meta = source_backup.with_suffix(".meta.json")
        if not source_backup.exists():
            raise BackupError(f"Backup not found: {backup_name}")
        if not source_meta.exists():
            raise BackupError(f"Backup metadata not found: {source_meta.name}")

        safe_segment = self._sanitize_export_segment(destination_subdir or "default")
        destination_root = (self.export_dir / safe_segment).resolve()
        if not str(destination_root).startswith(str(self.export_dir.resolve())):
            raise BackupError("Unsafe export destination blocked")
        destination_root.mkdir(parents=True, exist_ok=True)

        out_backup = destination_root / source_backup.name
        out_meta = destination_root / source_meta.name
        shutil.copy2(source_backup, out_backup)
        shutil.copy2(source_meta, out_meta)

        return {
            "ok": True,
            "backup": source_backup.name,
            "exported_backup": str(out_backup.relative_to(self.project_root).as_posix()),
            "exported_meta": str(out_meta.relative_to(self.project_root).as_posix()),
            "size": out_backup.stat().st_size,
        }

    def preflight_restore(self, backup_name: str) -> dict[str, object]:
        payload = self._decrypt_backup_payload(backup_name)
        entries = self._extract_zip_entries(payload)

        actions: list[dict[str, str]] = []
        counts = {"create": 0, "update": 0, "unchanged": 0}

        for rel_path, backed_up_bytes in entries.items():
            target = self._resolve_target_path(rel_path)
            if not target.exists():
                action = "create"
            else:
                current_hash = hashlib.sha256(target.read_bytes()).hexdigest()
                backup_hash = hashlib.sha256(backed_up_bytes).hexdigest()
                action = "unchanged" if current_hash == backup_hash else "update"
            counts[action] += 1
            actions.append({"path": rel_path, "action": action})

        actions.sort(key=lambda item: item["path"])
        plan_payload = {
            "backup": backup_name,
            "actions": actions,
            "counts": counts,
        }
        plan_hash = hashlib.sha256(json.dumps(plan_payload, sort_keys=True).encode("utf-8")).hexdigest()

        return {
            "backup": backup_name,
            "plan_hash": plan_hash,
            "counts": counts,
            "actions": actions,
        }

    def restore_backup(self, backup_name: str, expected_plan_hash: str | None = None) -> dict[str, str | int]:
        preflight = self.preflight_restore(backup_name)
        plan_hash = str(preflight["plan_hash"])
        if expected_plan_hash and expected_plan_hash != plan_hash:
            raise BackupError("Restore plan hash mismatch. Run preflight again before restoring.")

        payload = self._decrypt_backup_payload(backup_name)
        entries = self._extract_zip_entries(payload)

        restore_id = f"restore_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        tx_root = self.restore_dir / restore_id
        staging_root = tx_root / "staging"
        rollback_root = tx_root / "rollback"
        staging_root.mkdir(parents=True, exist_ok=True)
        rollback_root.mkdir(parents=True, exist_ok=True)

        written_files: list[Path] = []
        backup_copies: list[tuple[Path, Path]] = []

        try:
            for rel_path, file_bytes in entries.items():
                staged_path = (staging_root / rel_path).resolve()
                if not str(staged_path).startswith(str(staging_root.resolve())):
                    raise BackupError(f"Unsafe staging path blocked: {rel_path}")
                staged_path.parent.mkdir(parents=True, exist_ok=True)
                staged_path.write_bytes(file_bytes)

            for rel_path in sorted(entries.keys()):
                target = self._resolve_target_path(rel_path)
                staged_path = (staging_root / rel_path).resolve()

                if target.exists():
                    rollback_copy = (rollback_root / rel_path).resolve()
                    rollback_copy.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(target, rollback_copy)
                    backup_copies.append((target, rollback_copy))

                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(staged_path, target)
                written_files.append(target)

        except Exception as exc:
            self._rollback_restore(written_files, backup_copies)
            raise BackupError(f"restore rolled back after failure: {exc}") from exc

        manifest = {
            "restore_id": restore_id,
            "backup": backup_name,
            "plan_hash": plan_hash,
            "restored_files": len(entries),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        (tx_root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        return {
            "status": "restored",
            "backup": backup_name,
            "restore_id": restore_id,
            "files_restored": len(entries),
            "plan_hash": plan_hash,
        }

    def _rollback_restore(self, written_files: list[Path], backup_copies: list[tuple[Path, Path]]) -> None:
        backup_lookup = {target: rollback for (target, rollback) in backup_copies}

        for target in reversed(written_files):
            rollback_copy = backup_lookup.get(target)
            if rollback_copy and rollback_copy.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(rollback_copy, target)
            else:
                if target.exists():
                    target.unlink()

    def _decrypt_backup_payload(self, backup_name: str) -> bytes:
        path = self.backups_dir / backup_name
        if not path.exists():
            raise BackupError(f"Backup not found: {backup_name}")

        key = self._load_or_create_key()
        fernet = Fernet(key)
        return fernet.decrypt(path.read_bytes())

    def _extract_zip_entries(self, payload: bytes) -> dict[str, bytes]:
        entries: dict[str, bytes] = {}
        with ZipFile(io.BytesIO(payload), "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue
                rel_path = Path(member.filename).as_posix()
                self._resolve_target_path(rel_path)
                with zf.open(member, "r") as src:
                    entries[rel_path] = src.read()
        return entries

    def _resolve_target_path(self, rel_path: str) -> Path:
        target = (self.project_root / rel_path).resolve()
        if not str(target).startswith(str(self.project_root.resolve())):
            raise BackupError(f"Unsafe restore path blocked: {rel_path}")
        return target

    def _build_payload_zip(self) -> bytes:
        buffer = io.BytesIO()
        include_paths = self._collect_backup_paths()

        with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as zf:
            for path in include_paths:
                if path.is_file():
                    arcname = path.relative_to(self.project_root).as_posix()
                    zf.write(path, arcname=arcname)
        return buffer.getvalue()

    def _collect_backup_paths(self) -> list[Path]:
        paths: list[Path] = []

        db_file = self.data_dir / "jae_ai.sqlite3"
        if db_file.exists():
            paths.append(db_file)

        for rel in ["config/device.local.yaml", "config/user.local.yaml"]:
            p = self.project_root / rel
            if p.exists():
                paths.append(p)

        for rel in ["data/workspace", "backend/skills", "backend/agents"]:
            root = self.project_root / rel
            if root.exists() and root.is_dir():
                for child in root.rglob("*"):
                    if child.is_file():
                        paths.append(child)

        return paths

    def _load_or_create_key(self) -> bytes:
        env_key = os.getenv("JAE_AI_BACKUP_KEY")
        if env_key:
            return env_key.encode("utf-8")

        if self.key_file.exists():
            return self.key_file.read_text(encoding="utf-8").strip().encode("utf-8")

        self.key_file.parent.mkdir(parents=True, exist_ok=True)
        key = Fernet.generate_key()
        self.key_file.write_text(key.decode("utf-8"), encoding="utf-8")
        return key

    def _load_or_create_signing_key(self) -> bytes:
        env_key = os.getenv("JAE_AI_BACKUP_SIGNING_KEY")
        if env_key:
            try:
                return base64.urlsafe_b64decode(env_key.encode("utf-8"))
            except Exception as exc:
                raise BackupError(f"Invalid JAE_AI_BACKUP_SIGNING_KEY format: {exc}") from exc

        if self.signing_key_file.exists():
            raw = self.signing_key_file.read_text(encoding="utf-8").strip()
            return base64.urlsafe_b64decode(raw.encode("utf-8"))

        self.signing_key_file.parent.mkdir(parents=True, exist_ok=True)
        secret = os.urandom(32)
        encoded = base64.urlsafe_b64encode(secret).decode("utf-8")
        self.signing_key_file.write_text(encoded, encoding="utf-8")
        return secret

    def _sign_metadata(self, metadata: dict[str, object]) -> str:
        signing_key = self._load_or_create_signing_key()
        payload = dict(metadata)
        payload.pop("signature", None)
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hmac.new(signing_key, canonical, digestmod=hashlib.sha256).hexdigest()

    def _verify_metadata_signature(self, metadata: dict[str, object]) -> bool:
        received = str(metadata.get("signature", ""))
        if not received:
            return False
        expected = self._sign_metadata(metadata)
        return hmac.compare_digest(received, expected)

    def _sanitize_export_segment(self, value: str) -> str:
        cleaned = value.strip().replace("..", "")
        cleaned = cleaned.replace("\\", "/")
        cleaned = cleaned.strip("/")
        if not cleaned:
            return "default"
        return "".join(ch for ch in cleaned if ch.isalnum() or ch in {"-", "_", "/"})
