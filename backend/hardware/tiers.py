from __future__ import annotations

from pathlib import Path

import yaml

from backend.hardware.schemas import HardwareProfile, HardwareTier


class HardwareTierSelector:
    def __init__(self, config_path: Path) -> None:
        self.config_path = config_path
        self.tiers = self._load_tiers()

    def select_tier(self, profile: HardwareProfile, manual_override: str | None = None) -> HardwareTier:
        if manual_override:
            for tier in self.tiers:
                if tier.name == manual_override.upper():
                    return tier

        max_vram = max((gpu.vram_gb for gpu in profile.gpus), default=0.0)
        selected = self.tiers[0]
        for tier in self.tiers:
            if profile.total_ram_gb >= tier.min_ram_gb and max_vram >= tier.min_vram_gb:
                selected = tier
        return selected

    def _load_tiers(self) -> list[HardwareTier]:
        with self.config_path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}

        tier_rows = raw.get("tiers", [])
        tiers = [HardwareTier.model_validate(row) for row in tier_rows]
        order = {"LEGACY": 1, "STANDARD": 2, "HIGH": 3, "ULTRA": 4}
        tiers.sort(key=lambda t: order.get(t.name, 0))
        if not tiers:
            raise ValueError("No hardware tiers found in config")
        return tiers
