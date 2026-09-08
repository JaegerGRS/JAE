from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from backend.core.constants import APP_NAME, DEFAULT_BIND_HOST, DEFAULT_BIND_PORT


class ServerConfig(BaseModel):
    host: str = DEFAULT_BIND_HOST
    port: int = DEFAULT_BIND_PORT
    allow_lan: bool = False


class InferenceConfig(BaseModel):
    provider: str = "llamacpp"
    openai_base_url: str = "http://127.0.0.1:8080/v1"
    api_key: str | None = None
    request_timeout_seconds: int = 120


class PathsConfig(BaseModel):
    data_dir: str = "data"
    models_dir: str = "data/models"
    logs_dir: str = "data/logs"
    workspace_dir: str = "data/workspace"


class BackupConfig(BaseModel):
    enabled: bool = True
    backups_dir: str = "backups"
    key_file: str = "data/keys/backup.key"
    signing_key_file: str = "data/keys/backup-signing.key"
    export_dir: str = "data/exports/backups"


class DownloadConfig(BaseModel):
    max_concurrent_downloads: int = 1


class AppConfig(BaseModel):
    app_name: str = APP_NAME
    environment: str = "development"
    debug: bool = False
    version: str = "0.0.1"
    node_id: str = "JAE-MAIN"
    bind_localhost_only: bool = True
    server: ServerConfig = Field(default_factory=ServerConfig)
    inference: InferenceConfig = Field(default_factory=InferenceConfig)
    paths: PathsConfig = Field(default_factory=PathsConfig)
    backup: BackupConfig = Field(default_factory=BackupConfig)
    downloads: DownloadConfig = Field(default_factory=DownloadConfig)


class ConfigLoader:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root
        self.config_dir = project_root / "config"

    def load(self) -> AppConfig:
        defaults = self._read_yaml(self.config_dir / "defaults.yaml")
        device_local = self._read_yaml(self.config_dir / "device.local.yaml", optional=True)
        user_local = self._read_yaml(self.config_dir / "user.local.yaml", optional=True)

        merged = self._deep_merge(defaults, device_local)
        merged = self._deep_merge(merged, user_local)
        merged = self._apply_env_overrides(merged)

        cfg = AppConfig.model_validate(merged)
        if cfg.bind_localhost_only:
            cfg.server.host = "127.0.0.1"
        return cfg

    def _read_yaml(self, path: Path, optional: bool = False) -> dict[str, Any]:
        if optional and not path.exists():
            return {}
        if not path.exists():
            raise FileNotFoundError(f"Missing required config file: {path}")
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        if not isinstance(data, dict):
            raise ValueError(f"Config at {path} must be a YAML object")
        return data

    def _deep_merge(self, base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
        if not overlay:
            return dict(base)
        result = dict(base)
        for key, value in overlay.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    def _apply_env_overrides(self, data: dict[str, Any]) -> dict[str, Any]:
        result = dict(data)
        env_map = {
            "JAE_AI_ENV": ("environment",),
            "JAE_AI_DEBUG": ("debug",),
            "JAE_AI_NODE_ID": ("node_id",),
            "JAE_AI_HOST": ("server", "host"),
            "JAE_AI_PORT": ("server", "port"),
            "JAE_AI_INFERENCE_PROVIDER": ("inference", "provider"),
            "JAE_AI_OPENAI_BASE_URL": ("inference", "openai_base_url"),
            "JAE_AI_OPENAI_API_KEY": ("inference", "api_key"),
            "JAE_AI_BACKUP_ENABLED": ("backup", "enabled"),
            "JAE_AI_BACKUPS_DIR": ("backup", "backups_dir"),
            "JAE_AI_BACKUP_KEY_FILE": ("backup", "key_file"),
            "JAE_AI_BACKUP_SIGNING_KEY_FILE": ("backup", "signing_key_file"),
            "JAE_AI_BACKUP_EXPORT_DIR": ("backup", "export_dir"),
        }
        for env_name, path in env_map.items():
            value = os.getenv(env_name)
            if value is None:
                continue
            self._set_nested(result, path, self._coerce(value))
        return result

    def _set_nested(self, data: dict[str, Any], path: tuple[str, ...], value: Any) -> None:
        cursor = data
        for key in path[:-1]:
            if key not in cursor or not isinstance(cursor[key], dict):
                cursor[key] = {}
            cursor = cursor[key]
        cursor[path[-1]] = value

    @staticmethod
    def _coerce(value: str) -> Any:
        low = value.lower()
        if low in {"true", "false"}:
            return low == "true"
        if value.isdigit():
            return int(value)
        return value
