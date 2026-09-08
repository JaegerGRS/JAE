from __future__ import annotations

from backend.core.config import AppConfig
from backend.inference.providers.llamacpp import LlamaCppProvider
from backend.inference.schemas import InferenceProvider


class InferenceProviderFactory:
    @staticmethod
    def build(config: AppConfig) -> InferenceProvider:
        provider_name = config.inference.provider.lower()
        if provider_name == "llamacpp":
            return LlamaCppProvider(config.inference)
        raise ValueError(f"Unsupported inference provider: {config.inference.provider}")
