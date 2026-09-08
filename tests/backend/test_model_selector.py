from __future__ import annotations

from backend.hardware.schemas import CpuInfo, GpuInfo, HardwareCapabilities, HardwareProfile, HardwareTier
from backend.models.schemas import ModelSpec
from backend.models.selector import ModelSelector


def test_model_selector_prefers_compatible_model() -> None:
    selector = ModelSelector()
    profile = HardwareProfile(
        device_id="x",
        hostname="x",
        os="Windows",
        os_version="11",
        cpu=CpuInfo(model="i7", cores=8, threads=8),
        total_ram_gb=16,
        free_ram_gb=8,
        gpus=[GpuInfo(vendor="NVIDIA", model="GTX", vram_gb=6)],
        capabilities=HardwareCapabilities(cuda=True, hip=False, vulkan=True, cpu=True),
    )
    tier = HardwareTier(
        name="LEGACY",
        min_ram_gb=0,
        min_vram_gb=0,
        max_context=4096,
        max_concurrent_requests=1,
        preferred_model_classes=["3b"],
    )
    models = [
        ModelSpec(
            id="m1",
            name="Model 3B",
            description="",
            source="",
            download_url="",
            filename="",
            sha256="",
            architecture="",
            parameter_count="3b",
            quantization="q4",
            required_ram_gb=8,
            recommended_ram_gb=16,
            required_vram_gb=4,
            recommended_vram_gb=6,
            context_limit=4096,
            capabilities=["chat", "coding"],
            backend_compatibility=["llamacpp"],
            priority=10,
        )
    ]

    result = selector.select("CODING", profile, tier, models)
    assert result.selected_model_id == "m1"
