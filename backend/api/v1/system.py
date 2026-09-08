from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_config, get_hardware_detector, get_tier_selector
from backend.core.schemas import ApiResponse

router = APIRouter(prefix="/system", tags=["system"])


@router.get("", response_model=ApiResponse)
async def get_system(config=Depends(get_config), detector=Depends(get_hardware_detector), tier_selector=Depends(get_tier_selector)) -> ApiResponse:
    profile = detector.detect()
    tier = tier_selector.select_tier(profile)
    return ApiResponse(
        data={
            "app_name": config.app_name,
            "node_id": config.node_id,
            "hardware": profile.model_dump(),
            "tier": tier.model_dump(),
            "inference_backend": config.inference.provider,
        }
    )
