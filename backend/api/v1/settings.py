from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_config
from backend.core.schemas import ApiResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=ApiResponse)
async def get_settings(config=Depends(get_config)) -> ApiResponse:
    return ApiResponse(
        data={
            "app_name": config.app_name,
            "environment": config.environment,
            "node_id": config.node_id,
            "bind_localhost_only": config.bind_localhost_only,
            "inference_provider": config.inference.provider,
            "openai_base_url": config.inference.openai_base_url,
        }
    )
