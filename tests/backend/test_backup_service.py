from __future__ import annotations

from pathlib import Path
import json

import pytest

from backend.backup.service import BackupError, BackupService
from backend.core.config import AppConfig, PathsConfig


def test_backup_create_verify_restore_roundtrip(tmp_path: Path) -> None:
    project_root = tmp_path
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (project_root / "config").mkdir(parents=True, exist_ok=True)

    db_file = data_dir / "jae_ai.sqlite3"
    db_file.write_text("db-content-v1", encoding="utf-8")

    workspace = data_dir / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    doc = workspace / "notes.txt"
    doc.write_text("hello from backup", encoding="utf-8")

    cfg = AppConfig(paths=PathsConfig())
    service = BackupService(project_root, cfg)

    created = service.create_backup("unit_test_backup")
    assert str(created["name"]).endswith(".jxbak")

    verified = service.verify_backup(str(created["name"]))
    assert verified["ok"] is True

    doc.write_text("mutated", encoding="utf-8")
    db_file.write_text("mutated-db", encoding="utf-8")

    restored = service.restore_backup(str(created["name"]))
    assert restored["status"] == "restored"

    assert doc.read_text(encoding="utf-8") == "hello from backup"
    assert db_file.read_text(encoding="utf-8") == "db-content-v1"


def test_preflight_and_hash_mismatch_guard(tmp_path: Path) -> None:
    project_root = tmp_path
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    db_file = data_dir / "jae_ai.sqlite3"
    db_file.write_text("seed-db", encoding="utf-8")

    workspace = data_dir / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    tracked = workspace / "tracked.txt"
    tracked.write_text("version-a", encoding="utf-8")

    cfg = AppConfig(paths=PathsConfig())
    service = BackupService(project_root, cfg)
    created = service.create_backup("preflight_test")

    tracked.write_text("version-b", encoding="utf-8")

    preflight = service.preflight_restore(str(created["name"]))
    counts = preflight["counts"]
    assert isinstance(counts, dict)
    assert counts.get("update", 0) >= 1

    with pytest.raises(BackupError, match="plan hash mismatch"):
        service.restore_backup(str(created["name"]), expected_plan_hash="bad_hash")


def test_backup_signature_tamper_detection(tmp_path: Path) -> None:
    project_root = tmp_path
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "workspace").mkdir(parents=True, exist_ok=True)
    (data_dir / "workspace" / "note.txt").write_text("x", encoding="utf-8")
    (data_dir / "jae_ai.sqlite3").write_text("db", encoding="utf-8")

    cfg = AppConfig(paths=PathsConfig())
    service = BackupService(project_root, cfg)
    created = service.create_backup("signed_meta_test")

    meta_path = (project_root / cfg.backup.backups_dir / "signed_meta_test.meta.json")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["created_at"] = "1970-01-01T00:00:00+00:00"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    verified = service.verify_backup(str(created["name"]))
    assert verified["ok"] is False
    assert "signature" in str(verified["message"])


def test_export_encrypted_backup(tmp_path: Path) -> None:
    project_root = tmp_path
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "workspace").mkdir(parents=True, exist_ok=True)
    (data_dir / "workspace" / "note.txt").write_text("x", encoding="utf-8")
    (data_dir / "jae_ai.sqlite3").write_text("db", encoding="utf-8")

    cfg = AppConfig(paths=PathsConfig())
    service = BackupService(project_root, cfg)
    created = service.create_backup("export_test")

    exported = service.export_backup(str(created["name"]), "node-mirror")
    assert exported["ok"] is True

    backup_path = project_root / str(exported["exported_backup"])
    meta_path = project_root / str(exported["exported_meta"])
    assert backup_path.exists()
    assert meta_path.exists()
