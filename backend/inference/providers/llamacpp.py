from __future__ import annotations

from collections.abc import AsyncGenerator

import httpx

from backend.core.config import InferenceConfig
from backend.inference.schemas import GenerateRequest, GenerateResult, InferenceProvider, ProviderHealth


class LlamaCppProvider(InferenceProvider):
    name = "llamacpp"

    def __init__(self, cfg: InferenceConfig) -> None:
        self.cfg = cfg
        self._client = httpx.AsyncClient(timeout=cfg.request_timeout_seconds)

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        await self._client.aclose()

    async def health(self) -> ProviderHealth:
        try:
            response = await self._client.get(f"{self.cfg.openai_base_url}/models")
            if response.is_success:
                return ProviderHealth(ok=True, name=self.name, message="online")
            return ProviderHealth(ok=False, name=self.name, message=f"status={response.status_code}")
        except Exception as exc:
            return ProviderHealth(ok=False, name=self.name, message=str(exc))

    async def list_models(self) -> list[str]:
        response = await self._client.get(f"{self.cfg.openai_base_url}/models")
        response.raise_for_status()
        payload = response.json()
        return [item.get("id", "unknown") for item in payload.get("data", [])]

    async def generate(self, request: GenerateRequest) -> GenerateResult:
        headers = self._build_headers()
        payload = {
            "model": request.model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }
        response = await self._client.post(
            f"{self.cfg.openai_base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return GenerateResult(model=request.model, text=text)

    async def stream_generate(self, request: GenerateRequest) -> AsyncGenerator[str, None]:
        headers = self._build_headers()
        payload = {
            "model": request.model,
            "messages": [m.model_dump() for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }

        async with self._client.stream(
            "POST",
            f"{self.cfg.openai_base_url}/chat/completions",
            json=payload,
            headers=headers,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                chunk = line.removeprefix("data:").strip()
                if chunk == "[DONE]":
                    break
                yield chunk

    async def embed(self, texts: list[str], model: str) -> list[list[float]]:
        headers = self._build_headers()
        payload = {"model": model, "input": texts}
        response = await self._client.post(
            f"{self.cfg.openai_base_url}/embeddings",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        return [item["embedding"] for item in data.get("data", [])]

    def _build_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.cfg.api_key:
            headers["Authorization"] = f"Bearer {self.cfg.api_key}"
        return headers
