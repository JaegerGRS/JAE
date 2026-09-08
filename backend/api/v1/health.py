from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_config, get_provider
from backend.core.schemas import ApiResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=ApiResponse)
async def health(config=Depends(get_config), provider=Depends(get_provider)) -> ApiResponse:
    provider_health = await provider.health()
    return ApiResponse(
        data={
            "app": config.app_name,
            "version": config.version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend": "online",
            "database": "ok",
            "inference": provider_health.model_dump(),
        }
    )
