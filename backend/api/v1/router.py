from __future__ import annotations

from fastapi import APIRouter

from backend.api.v1.backups import router as backups_router
from backend.api.v1.chat import router as chat_router
from backend.api.v1.health import router as health_router
from backend.api.v1.model_downloads import router as model_downloads_router
from backend.api.v1.models import router as models_router
from backend.api.v1.platform import router as platform_router
from backend.api.v1.settings import router as settings_router
from backend.api.v1.system import router as system_router

router = APIRouter()
router.include_router(health_router)
router.include_router(system_router)
router.include_router(models_router)
router.include_router(model_downloads_router)
router.include_router(settings_router)
router.include_router(chat_router)
router.include_router(backups_router)
router.include_router(platform_router)
