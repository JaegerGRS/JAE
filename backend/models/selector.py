from __future__ import annotations

from backend.hardware.schemas import HardwareProfile, HardwareTier
from backend.models.schemas import ModelSelectionResult, ModelSpec, TaskType


TASK_CAPABILITY_MAP: dict[TaskType, str] = {
    "FAST": "chat",
    "GENERAL": "chat",
    "REASONING": "reasoning",
    "CODING": "coding",
    "VISION": "vision",
    "EMBEDDING": "embeddings",
}


class ModelSelector:
    def compatible_models(
        self,
        task_type: TaskType,
        hardware: HardwareProfile,
        models: list[ModelSpec],
    ) -> list[ModelSpec]:
        capability = TASK_CAPABILITY_MAP[task_type]
        max_vram = max((gpu.vram_gb for gpu in hardware.gpus), default=0.0)

        candidates = [
            m
            for m in models
            if capability in m.capabilities
            and hardware.total_ram_gb >= m.required_ram_gb
            and max_vram >= m.required_vram_gb
        ]
        if not candidates and capability != "chat":
            candidates = [
                m
                for m in models
                if "chat" in m.capabilities
                and hardware.total_ram_gb >= m.required_ram_gb
                and max_vram >= m.required_vram_gb
            ]
        return candidates

    def select(
        self,
        task_type: TaskType,
        hardware: HardwareProfile,
        tier: HardwareTier,
        models: list[ModelSpec],
    ) -> ModelSelectionResult:
        candidates = self.compatible_models(task_type, hardware, models)
        if not candidates:
            raise ValueError("No compatible models found in manifest")

        preferred_classes = [c.lower() for c in tier.preferred_model_classes]

        def score(model: ModelSpec) -> tuple[int, int]:
            boost = 0
            descriptor = f"{model.parameter_count} {model.name}".lower()
            if any(cls in descriptor for cls in preferred_classes):
                boost = 100
            return (boost, -model.priority)

        best = sorted(candidates, key=score, reverse=True)[0]
        return ModelSelectionResult(
            task_type=task_type,
            selected_model_id=best.id,
            reason=f"Selected {best.name} for task={task_type} tier={tier.name}",
        )
