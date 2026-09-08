from __future__ import annotations

from pathlib import Path

from backend.core.config import ConfigLoader


def test_config_loads_defaults() -> None:
    root = Path(__file__).resolve().parents[2]
    cfg = ConfigLoader(root).load()
    assert cfg.app_name == "JAE AI"
    assert cfg.server.host == "127.0.0.1"
    assert cfg.inference.provider == "llamacpp"
