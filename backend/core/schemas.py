from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    ok: bool = True
    message: str = "ok"
    data: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    ok: bool = False
    message: str
    error_code: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
