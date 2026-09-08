from __future__ import annotations

from pathlib import Path

import yaml

from backend.models.schemas import ModelManifest


class ModelManifestLoader:
    def __init__(self, manifest_path: Path) -> None:
        self.manifest_path = manifest_path

    def load(self) -> ModelManifest:
        with self.manifest_path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}
        return ModelManifest.model_validate(raw)
