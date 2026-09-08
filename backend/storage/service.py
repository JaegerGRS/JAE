from __future__ import annotations

import ctypes
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import psutil

from backend.core.config import AppConfig


class StorageService:
    def __init__(self, project_root: Path, config: AppConfig) -> None:
        self.project_root = project_root
        self.config = config
        self.local_root = project_root
        self.storage_config_path = project_root / "config" / "storage.json"
        self.portable_folder_name = "JAE-Portable"
        self.marker_filename = "jae-portable.json"
        self._startup_root = self._resolve_root_from_state(self._read_state())

    def get_active_root(self) -> Path:
        return self._startup_root

    def get_status(self) -> dict[str, object]:
        state = self._read_state()
        current_root = self.get_active_root()
        next_root = self._resolve_root_from_state(state)
        return {
            "mode": state["mode"],
            "auto_detect_usb": state["auto_detect_usb"],
            "local_root": str(self.local_root),
            "active_root": str(current_root),
            "active_storage": "portable" if current_root != self.local_root else "local",
            "next_launch_root": str(next_root),
            "database_path": str(current_root / self.config.paths.data_dir / "jae_ai.sqlite3"),
            "portable_candidates": self.list_portable_candidates(),
            "restart_required": current_root != next_root,
        }

    def use_auto_detect(self) -> dict[str, object]:
        state = self._read_state()
        state["mode"] = "auto"
        self._write_state(state)
        return self.get_status()

    def move_to_local(self) -> dict[str, object]:
        source_root = self.get_active_root()
        if source_root != self.local_root:
            self._copy_runtime(source_root, self.local_root)
        state = self._read_state()
        state["mode"] = "local"
        state["portable_root"] = ""
        self._write_state(state)
        return self.get_status()

    def move_to_portable(self, drive_path: str) -> dict[str, object]:
        portable_root = self._portable_root_from_drive(drive_path)
        portable_root.mkdir(parents=True, exist_ok=True)
        self._copy_runtime(self.get_active_root(), portable_root)
        self._write_marker(portable_root)
        state = self._read_state()
        state["mode"] = "portable"
        state["portable_root"] = str(portable_root)
        self._write_state(state)
        return self.get_status()

    def list_portable_candidates(self) -> list[dict[str, object]]:
        candidates: list[dict[str, object]] = []
        active_root = getattr(self, "_startup_root", self.local_root)
        for partition in psutil.disk_partitions(all=False):
            mountpoint = partition.mountpoint
            drive_path = Path(mountpoint)
            removable = self._is_removable_drive(drive_path, partition.opts)
            if not removable:
                continue
            portable_root = self._portable_root_from_drive(mountpoint)
            marker_path = portable_root / self.marker_filename
            try:
                usage = psutil.disk_usage(mountpoint)
                free_gb = round(usage.free / (1024 ** 3), 2)
            except Exception:
                free_gb = 0.0
            candidates.append(
                {
                    "drive": mountpoint,
                    "portable_root": str(portable_root),
                    "free_gb": free_gb,
                    "has_portable_data": marker_path.exists(),
                    "is_active": active_root == portable_root,
                }
            )
        return candidates

    def _copy_runtime(self, source_root: Path, target_root: Path) -> None:
        self._copy_config(source_root, target_root)
        self._copy_database(source_root, target_root)
        self._copy_optional_tree(source_root / self.config.paths.workspace_dir, target_root / self.config.paths.workspace_dir)
        self._copy_optional_tree(source_root / self.config.backup.backups_dir, target_root / self.config.backup.backups_dir)

    def _copy_config(self, source_root: Path, target_root: Path) -> None:
        source_config = source_root / "config"
        target_config = target_root / "config"
        if source_config.exists():
            if target_config.exists():
                shutil.rmtree(target_config)
            shutil.copytree(source_config, target_config)

    def _copy_database(self, source_root: Path, target_root: Path) -> None:
        source_db = source_root / self.config.paths.data_dir / "jae_ai.sqlite3"
        target_db = target_root / self.config.paths.data_dir / "jae_ai.sqlite3"
        target_db.parent.mkdir(parents=True, exist_ok=True)
        if not source_db.exists():
            return
        if target_db.exists():
            target_db.unlink()
        source_conn = sqlite3.connect(source_db)
        try:
            target_conn = sqlite3.connect(target_db)
            try:
                source_conn.backup(target_conn)
            finally:
                target_conn.close()
        finally:
            source_conn.close()

    def _copy_optional_tree(self, source: Path, target: Path) -> None:
        if not source.exists():
            return
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)

    def _portable_root_from_drive(self, drive_path: str | Path) -> Path:
        return Path(drive_path) / self.portable_folder_name

    def _marker_path(self, root: Path) -> Path:
        return root / self.marker_filename

    def _write_marker(self, root: Path) -> None:
        payload = {
            "app_name": self.config.app_name,
            "portable_root": str(root),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._marker_path(root).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _read_state(self) -> dict[str, object]:
        default_state: dict[str, object] = {
            "mode": "auto",
            "portable_root": "",
            "auto_detect_usb": True,
        }
        if not self.storage_config_path.exists():
            return default_state
        try:
            payload = json.loads(self.storage_config_path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                return default_state
            return {
                **default_state,
                **payload,
            }
        except Exception:
            return default_state

    def _write_state(self, state: dict[str, object]) -> None:
        self.storage_config_path.parent.mkdir(parents=True, exist_ok=True)
        self.storage_config_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _resolve_root_from_state(self, state: dict[str, object]) -> Path:
        mode = str(state.get("mode", "auto"))
        portable_root_raw = str(state.get("portable_root", "")).strip()
        portable_root = Path(portable_root_raw) if portable_root_raw else None
        if mode == "local":
            return self.local_root
        if mode == "portable" and portable_root and self._marker_path(portable_root).exists():
            return portable_root
        detected = self._detect_portable_root()
        if mode in {"portable", "auto"} and detected is not None:
            return detected
        return self.local_root

    def _detect_portable_root(self) -> Path | None:
        for candidate in self.list_portable_candidates():
            if candidate["has_portable_data"]:
                return Path(str(candidate["portable_root"]))
        return None

    def _is_removable_drive(self, drive_path: Path, opts: str) -> bool:
        lowered = opts.lower()
        if "removable" in lowered:
            return True
        if drive_path.drive:
            try:
                drive_type = ctypes.windll.kernel32.GetDriveTypeW(f"{drive_path.drive}\\")
                return drive_type == 2
            except Exception:
                return False
        return False
