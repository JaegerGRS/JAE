from __future__ import annotations

import ctypes
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import psutil

from backend.core.config import AppConfig

PORTABLE_CONTAINER = "JAE-Portable"
PORTABLE_MARKER = "jae-portable.json"
DRIVE_REMOVABLE = 2


class StorageService:
    def __init__(self, project_root: Path, config: AppConfig) -> None:
        self.project_root = project_root.resolve()
        self.config = config

    def get_status(self) -> dict[str, object]:
        current_mode = self._detect_mode(self.project_root)
        return {
            "current_root": self.project_root.as_posix(),
            "current_mode": current_mode,
            "database_path": (self.project_root / self.config.paths.data_dir / "jae_ai.sqlite3").as_posix(),
            "portable_drives": self._discover_portable_drives(),
            "native_root": self.native_runtime_root().as_posix(),
            "portable_container": PORTABLE_CONTAINER,
            "restart_required": True,
            "performance_hint": "Native drive is fastest. USB portable mode prioritizes mobility.",
        }

    def move_storage(self, target_mode: str, drive_root: str | None = None) -> dict[str, object]:
        if target_mode not in {"portable", "native"}:
            raise ValueError("target_mode must be 'portable' or 'native'")

        if target_mode == "portable":
            if not drive_root:
                raise ValueError("drive_root is required for portable mode")
            target_root = self.portable_runtime_root(Path(drive_root))
        else:
            target_root = self.native_runtime_root()

        target_root = target_root.resolve()
        target_root.mkdir(parents=True, exist_ok=True)
        self._copy_runtime_tree(self.project_root, target_root)

        if target_mode == "portable":
            self._write_marker(target_root)
        else:
            self._remove_marker(target_root)
            if self.is_portable_root(self.project_root):
                self._remove_marker(self.project_root)

        return {
            "target_root": target_root.as_posix(),
            "target_mode": target_mode,
            "database_path": (target_root / self.config.paths.data_dir / "jae_ai.sqlite3").as_posix(),
            "restart_required": True,
            "message": "Storage moved. Restart JAE to reopen chats from the new location.",
        }

    def native_runtime_root(self) -> Path:
        local_app_data = os.getenv("LOCALAPPDATA", "").strip()
        if local_app_data:
            return (Path(local_app_data) / "JAE" / "runtime").resolve()
        return (self.project_root / "portable-runtime-fallback").resolve()

    def portable_runtime_root(self, drive_root: Path) -> Path:
        return (drive_root / PORTABLE_CONTAINER / "runtime").resolve()

    def is_portable_root(self, root: Path) -> bool:
        return (root / PORTABLE_MARKER).exists()

    def _detect_mode(self, root: Path) -> str:
        if self.is_portable_root(root):
            return "portable"
        if root == self.native_runtime_root():
            return "native"
        return "workspace"

    def _copy_runtime_tree(self, source_root: Path, target_root: Path) -> None:
        paths_to_copy = [
            source_root / "config",
            source_root / self.config.paths.data_dir,
            source_root / self.config.backup.backups_dir,
        ]

        for source in paths_to_copy:
            if not source.exists():
                continue
            destination = target_root / source.relative_to(source_root)
            if source.is_dir():
                shutil.copytree(source, destination, dirs_exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)

    def _write_marker(self, runtime_root: Path) -> None:
        payload = {
            "name": "JAE Portable Runtime",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "root": runtime_root.as_posix(),
        }
        (runtime_root / PORTABLE_MARKER).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _remove_marker(self, runtime_root: Path) -> None:
        marker = runtime_root / PORTABLE_MARKER
        if marker.exists():
            marker.unlink()

    def _discover_portable_drives(self) -> list[dict[str, object]]:
        drives: list[dict[str, object]] = []
        seen: set[str] = set()
        for partition in psutil.disk_partitions(all=False):
            mountpoint = Path(partition.mountpoint)
            mount_key = mountpoint.as_posix().lower()
            if mount_key in seen or not mountpoint.exists():
                continue
            seen.add(mount_key)

            drive_type = self._get_drive_type(str(mountpoint))
            portable_root = self.portable_runtime_root(mountpoint)
            marker_present = (portable_root / PORTABLE_MARKER).exists()
            is_removable = drive_type == DRIVE_REMOVABLE
            if not is_removable and not marker_present:
                continue

            drives.append(
                {
                    "drive_root": mountpoint.as_posix(),
                    "portable_root": portable_root.as_posix(),
                    "device": partition.device,
                    "removable": is_removable,
                    "marker_present": marker_present,
                }
            )
        return drives

    def _get_drive_type(self, drive_path: str) -> int:
        try:
            return int(ctypes.windll.kernel32.GetDriveTypeW(f"{drive_path}\\"))
        except Exception:
            return 0
