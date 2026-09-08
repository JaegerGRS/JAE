from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.api.dependencies import (
    get_hardware_detector,
    get_manifest_loader,
    get_model_selector,
    get_tier_selector,
)
from backend.core.schemas import ApiResponse
from backend.models.schemas import TaskType

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=ApiResponse)
async def list_models(manifest_loader=Depends(get_manifest_loader)) -> ApiResponse:
    manifest = manifest_loader.load()
    return ApiResponse(data={"models": [m.model_dump() for m in manifest.models]})


@router.get("/select", response_model=ApiResponse)
async def select_model(task_type: TaskType, manifest_loader=Depends(get_manifest_loader), detector=Depends(get_hardware_detector), tier_selector=Depends(get_tier_selector), selector=Depends(get_model_selector)) -> ApiResponse:
    manifest = manifest_loader.load()
    if not manifest.models:
        raise HTTPException(status_code=404, detail="No models in manifest")
    profile = detector.detect()
    tier = tier_selector.select_tier(profile)
    result = selector.select(task_type=task_type, hardware=profile, tier=tier, models=manifest.models)
    return ApiResponse(data=result.model_dump())


@router.get("/recommendations", response_model=ApiResponse)
async def recommend_models(task_type: TaskType, manifest_loader=Depends(get_manifest_loader), detector=Depends(get_hardware_detector), tier_selector=Depends(get_tier_selector), selector=Depends(get_model_selector)) -> ApiResponse:
    manifest = manifest_loader.load()
    if not manifest.models:
        raise HTTPException(status_code=404, detail="No models in manifest")

    profile = detector.detect()
    tier = tier_selector.select_tier(profile)
    compatible = selector.compatible_models(task_type=task_type, hardware=profile, models=manifest.models)
    result = selector.select(task_type=task_type, hardware=profile, tier=tier, models=manifest.models)

    return ApiResponse(
        data={
            "task_type": task_type,
            "selected_model_id": result.selected_model_id,
            "reason": result.reason,
            "tier": tier.name,
            "hardware": {
                "total_ram_gb": profile.total_ram_gb,
                "max_vram_gb": max((gpu.vram_gb for gpu in profile.gpus), default=0.0),
            },
            "compatible_models": [m.model_dump() for m in compatible],
        }
    )
