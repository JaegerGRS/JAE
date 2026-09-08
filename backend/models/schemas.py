from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


ModelCapability = Literal[
    "chat",
    "reasoning",
    "coding",
    "vision",
    "summarization",
    "extraction",
    "tool_calling",
    "embeddings",
]

TaskType = Literal["FAST", "GENERAL", "REASONING", "CODING", "VISION", "EMBEDDING"]


class ModelSpec(BaseModel):
    id: str
    name: str
    description: str
    source: str
    download_url: str
    filename: str
    sha256: str
    architecture: str
    parameter_count: str
    quantization: str
    required_ram_gb: float
    recommended_ram_gb: float
    required_vram_gb: float
    recommended_vram_gb: float
    context_limit: int
    capabilities: list[ModelCapability] = Field(default_factory=list)
    backend_compatibility: list[str] = Field(default_factory=list)
    priority: int = 100


class ModelManifest(BaseModel):
    models: list[ModelSpec] = Field(default_factory=list)


class ModelSelectionResult(BaseModel):
    task_type: TaskType
    selected_model_id: str
    reason: str
