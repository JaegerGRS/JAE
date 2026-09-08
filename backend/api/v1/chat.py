from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.api.dependencies import (
    get_chat_service,
    get_database_session,
    get_hardware_detector,
    get_manifest_loader,
    get_model_selector,
    get_tier_selector,
)
from backend.core.schemas import ApiResponse
from backend.inference.schemas import ChatMessage
from backend.models.schemas import ModelSpec, TaskType

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    messages: list[ChatMessage] = Field(default_factory=list)
    task_type: TaskType = "GENERAL"
    model_id: str | None = None


def _resolve_model_id(
    request: ChatRequest,
    models: list[ModelSpec],
    detector,
    tier_selector,
    selector,
) -> str:
    profile = detector.detect()
    tier = tier_selector.select_tier(profile)
    compatible = {m.id for m in selector.compatible_models(request.task_type, profile, models)}

    if request.model_id:
        selected = next((m for m in models if m.id == request.model_id), None)
        if selected is None:
            raise HTTPException(status_code=404, detail=f"Model not found in manifest: {request.model_id}")
        if selected.id not in compatible:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Model {request.model_id} is not compatible with this device/task "
                    f"(task={request.task_type})."
                ),
            )
        return selected.id

    selection = selector.select(request.task_type, profile, tier, models)
    return selection.selected_model_id


@router.post("/create", response_model=ApiResponse)
def create_chat(chat_service=Depends(get_chat_service), db: Session = Depends(get_database_session)) -> ApiResponse:
    convo = chat_service.create_conversation(db)
    return ApiResponse(data={"conversation_id": convo.id, "title": convo.title})


@router.post("", response_model=ApiResponse)
async def chat(request: ChatRequest, chat_service=Depends(get_chat_service), db: Session = Depends(get_database_session), manifest_loader=Depends(get_manifest_loader), detector=Depends(get_hardware_detector), tier_selector=Depends(get_tier_selector), selector=Depends(get_model_selector)) -> ApiResponse:
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    manifest = manifest_loader.load()
    selected_model_id = _resolve_model_id(request, manifest.models, detector, tier_selector, selector)

    conversation_id = request.conversation_id
    if conversation_id is None:
        conversation = chat_service.create_conversation(db)
        conversation_id = conversation.id

    user_msg = request.messages[-1]
    chat_service.append_message(db, conversation_id, "user", user_msg.content)
    answer = await chat_service.generate_once(selected_model_id, request.messages)
    chat_service.append_message(db, conversation_id, "assistant", answer, model_id=selected_model_id)

    return ApiResponse(
        data={
            "conversation_id": conversation_id,
            "model_id": selected_model_id,
            "response": answer,
        }
    )


@router.post("/stream")
async def chat_stream(request: ChatRequest, chat_service=Depends(get_chat_service), db: Session = Depends(get_database_session), manifest_loader=Depends(get_manifest_loader), detector=Depends(get_hardware_detector), tier_selector=Depends(get_tier_selector), selector=Depends(get_model_selector)):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    manifest = manifest_loader.load()
    selected_model_id = _resolve_model_id(request, manifest.models, detector, tier_selector, selector)

    conversation_id = request.conversation_id
    if conversation_id is None:
        conversation = chat_service.create_conversation(db)
        conversation_id = conversation.id

    user_msg = request.messages[-1]
    chat_service.append_message(db, conversation_id, "user", user_msg.content)

    async def event_stream():
        chunks: list[str] = []
        try:
            async for token in chat_service.stream_generate(selected_model_id, request.messages):
                chunks.append(token)
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

            full = "".join(chunks)
            if full:
                chat_service.append_message(db, conversation_id, "assistant", full, model_id=selected_model_id)
            yield f"event: done\ndata: {json.dumps({'conversation_id': conversation_id, 'model_id': selected_model_id})}\n\n"
        except Exception as exc:
            message = str(exc) or "stream failed"
            yield f"event: error\ndata: {json.dumps({'error': message})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
