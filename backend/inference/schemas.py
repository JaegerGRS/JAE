from __future__ import annotations

from collections.abc import AsyncGenerator

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    model: str
    messages: list[ChatMessage] = Field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 512


class GenerateResult(BaseModel):
    model: str
    text: str


class ProviderHealth(BaseModel):
    ok: bool
    name: str
    message: str


class InferenceProvider:
    name: str

    async def start(self) -> None:
        raise NotImplementedError

    async def stop(self) -> None:
        raise NotImplementedError

    async def health(self) -> ProviderHealth:
        raise NotImplementedError

    async def list_models(self) -> list[str]:
        raise NotImplementedError

    async def generate(self, request: GenerateRequest) -> GenerateResult:
        raise NotImplementedError

    async def stream_generate(self, request: GenerateRequest) -> AsyncGenerator[str, None]:
        raise NotImplementedError

    async def embed(self, texts: list[str], model: str) -> list[list[float]]:
        raise NotImplementedError
