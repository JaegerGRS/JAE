from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.dependencies import _config
from backend.api.v1.router import router as v1_router
from backend.core.constants import API_PREFIX
from backend.core.logging_config import configure_logging

PROJECT_ROOT = Path(__file__).resolve().parents[1]
config = _config

configure_logging(PROJECT_ROOT / config.paths.logs_dir)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting %s v%s", config.app_name, config.version)
    yield
    logger.info("Shutting down service")


app = FastAPI(title=config.app_name, version=config.version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=API_PREFIX)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": config.app_name, "version": config.version, "status": "running"}
