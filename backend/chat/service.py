from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from backend.database.models import Conversation, Message
from backend.inference.schemas import ChatMessage, GenerateRequest, InferenceProvider


class ChatService:
    def __init__(self, provider: InferenceProvider) -> None:
        self.provider = provider

    def create_conversation(self, db: Session, title: str = "New Chat") -> Conversation:
        convo = Conversation(title=title)
        db.add(convo)
        db.commit()
        db.refresh(convo)
        return convo

    def append_message(self, db: Session, conversation_id: int, role: str, content: str, model_id: str | None = None) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_id=model_id,
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    async def generate_once(self, model_id: str, messages: list[ChatMessage]) -> str:
        result = await self.provider.generate(GenerateRequest(model=model_id, messages=messages))
        return result.text

    async def stream_generate(self, model_id: str, messages: list[ChatMessage]) -> AsyncGenerator[str, None]:
        async for chunk in self.provider.stream_generate(GenerateRequest(model=model_id, messages=messages)):
            try:
                parsed = json.loads(chunk)
                delta = parsed["choices"][0]["delta"].get("content", "")
                if delta:
                    yield delta
            except Exception:
                continue
