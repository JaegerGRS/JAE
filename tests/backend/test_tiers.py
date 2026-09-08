from __future__ import annotations

from pathlib import Path

from backend.hardware.schemas import CpuInfo, GpuInfo, HardwareCapabilities, HardwareProfile
from backend.hardware.tiers import HardwareTierSelector


def _profile(ram: float, vram: float) -> HardwareProfile:
    return HardwareProfile(
        device_id="abc",
        hostname="node",
        os="Windows",
        os_version="10",
        cpu=CpuInfo(model="i7", cores=8, threads=8),
        total_ram_gb=ram,
        free_ram_gb=ram / 2,
        gpus=[GpuInfo(vendor="NVIDIA", model="GPU", vram_gb=vram)],
        capabilities=HardwareCapabilities(cuda=True, hip=False, vulkan=True, cpu=True),
    )


def test_tier_selection() -> None:
    root = Path(__file__).resolve().parents[2]
    selector = HardwareTierSelector(root / "config" / "hardware-tiers.yaml")

    assert selector.select_tier(_profile(16, 6)).name == "LEGACY"
    assert selector.select_tier(_profile(32, 8)).name == "STANDARD"
    assert selector.select_tier(_profile(96, 16)).name == "ULTRA"
