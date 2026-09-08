from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_download_manager
from backend.core.schemas import ApiResponse

router = APIRouter(prefix="/models", tags=["model-downloads"])


class DownloadRequest(BaseModel):
    model_id: str


@router.get("/status", response_model=ApiResponse)
def list_model_status(download_manager=Depends(get_download_manager)) -> ApiResponse:
    return ApiResponse(data={"models": download_manager.list_model_status()})


@router.get("/downloads", response_model=ApiResponse)
def list_download_jobs(download_manager=Depends(get_download_manager)) -> ApiResponse:
    return ApiResponse(data={"jobs": download_manager.list_jobs()})


@router.post("/download", response_model=ApiResponse)
def start_download(request: DownloadRequest, download_manager=Depends(get_download_manager)) -> ApiResponse:
    try:
        job = download_manager.start_download(request.model_id)
        return ApiResponse(data={"job": job.__dict__})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/download/{job_id}", response_model=ApiResponse)
def get_download_job(job_id: str, download_manager=Depends(get_download_manager)) -> ApiResponse:
    try:
        job = download_manager.get_job(job_id)
        return ApiResponse(data={"job": job.__dict__})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/download/{job_id}/cancel", response_model=ApiResponse)
def cancel_download_job(job_id: str, download_manager=Depends(get_download_manager)) -> ApiResponse:
    try:
        job = download_manager.cancel_job(job_id)
        return ApiResponse(data={"job": job.__dict__})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{model_id}", response_model=ApiResponse)
def delete_model(model_id: str, download_manager=Depends(get_download_manager)) -> ApiResponse:
    try:
        result = download_manager.delete_model(model_id)
        return ApiResponse(data=result)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
