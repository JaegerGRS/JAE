from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CpuInfo(BaseModel):
    model: str = "Unknown"
    cores: int = 0
    threads: int = 0


class GpuInfo(BaseModel):
    vendor: str = "Unknown"
    model: str = "Unknown"
    vram_gb: float = 0.0


class HardwareCapabilities(BaseModel):
    cuda: bool = False
    hip: bool = False
    vulkan: bool = False
    cpu: bool = True


class HardwareProfile(BaseModel):
    device_id: str
    hostname: str
    os: str
    os_version: str
    cpu: CpuInfo
    total_ram_gb: float
    free_ram_gb: float
    gpus: list[GpuInfo] = Field(default_factory=list)
    capabilities: HardwareCapabilities = Field(default_factory=HardwareCapabilities)


TierName = Literal["LEGACY", "STANDARD", "HIGH", "ULTRA"]


class HardwareTier(BaseModel):
    name: TierName
    min_ram_gb: int
    min_vram_gb: int
    max_context: int
    max_concurrent_requests: int
    preferred_model_classes: list[str]
