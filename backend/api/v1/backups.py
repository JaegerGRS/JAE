from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.dependencies import get_backup_service, get_database_session
from backend.backup.service import BackupError
from backend.core.schemas import ApiResponse
from backend.database.models import BackupRecord

router = APIRouter(prefix="/backups", tags=["backups"])


class CreateBackupRequest(BaseModel):
    backup_name: str | None = None


class VerifyBackupRequest(BaseModel):
    backup_name: str


class PreflightRestoreRequest(BaseModel):
    backup_name: str


class RestoreBackupRequest(BaseModel):
    backup_name: str
    expected_plan_hash: str | None = None


class ExportBackupRequest(BaseModel):
    backup_name: str
    destination_subdir: str | None = None


@router.get("", response_model=ApiResponse)
def list_backups(backup_service=Depends(get_backup_service)) -> ApiResponse:
    return ApiResponse(data={"backups": backup_service.list_backups()})


@router.post("/create", response_model=ApiResponse)
def create_backup(request: CreateBackupRequest, backup_service=Depends(get_backup_service), db: Session = Depends(get_database_session)) -> ApiResponse:
    try:
        result = backup_service.create_backup(request.backup_name)
        db.add(
            BackupRecord(
                backup_name=str(result["name"]),
                checksum=str(result["checksum"]),
                status="created",
            )
        )
        db.commit()
        return ApiResponse(data=result)
    except BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/verify", response_model=ApiResponse)
def verify_backup(request: VerifyBackupRequest, backup_service=Depends(get_backup_service), db: Session = Depends(get_database_session)) -> ApiResponse:
    try:
        result = backup_service.verify_backup(request.backup_name)
        db.add(
            BackupRecord(
                backup_name=request.backup_name,
                checksum=str(result.get("checksum", "")),
                status="verified" if result.get("ok") else "verify_failed",
            )
        )
        db.commit()
        return ApiResponse(data=result)
    except BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/preflight", response_model=ApiResponse)
def preflight_restore(request: PreflightRestoreRequest, backup_service=Depends(get_backup_service)) -> ApiResponse:
    try:
        result = backup_service.preflight_restore(request.backup_name)
        return ApiResponse(data=result)
    except BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/restore", response_model=ApiResponse)
def restore_backup(request: RestoreBackupRequest, backup_service=Depends(get_backup_service), db: Session = Depends(get_database_session)) -> ApiResponse:
    try:
        result = backup_service.restore_backup(request.backup_name, request.expected_plan_hash)
        db.add(
            BackupRecord(
                backup_name=request.backup_name,
                checksum=str(result.get("plan_hash", "")),
                status="restored",
            )
        )
        db.commit()
        return ApiResponse(data=result)
    except BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/export", response_model=ApiResponse)
def export_backup(request: ExportBackupRequest, backup_service=Depends(get_backup_service), db: Session = Depends(get_database_session)) -> ApiResponse:
    try:
        result = backup_service.export_backup(request.backup_name, request.destination_subdir)
        db.add(
            BackupRecord(
                backup_name=request.backup_name,
                checksum="",
                status="exported",
            )
        )
        db.commit()
        return ApiResponse(data=result)
    except BackupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
