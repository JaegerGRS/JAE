from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.api.dependencies import get_config, get_database_session, get_hardware_detector
from backend.core.schemas import ApiResponse
from backend.database.models import Conversation, MemoryEntry

router = APIRouter(tags=["platform"])


@router.get("/version", response_model=ApiResponse)
async def get_version(config=Depends(get_config)) -> ApiResponse:
    return ApiResponse(
        data={
            "app_name": config.app_name,
            "version": config.version,
            "node_id": config.node_id,
        }
    )


@router.get("/conversations", response_model=ApiResponse)
def list_conversations(db: Session = Depends(get_database_session)) -> ApiResponse:
    rows = (
        db.query(Conversation)
        .filter(Conversation.deleted.is_(False))
        .order_by(Conversation.updated_at.desc())
        .limit(100)
        .all()
    )
    return ApiResponse(
        data={
            "count": len(rows),
            "items": [
                {
                    "id": row.id,
                    "title": row.title,
                    "created_at": row.created_at.isoformat(),
                    "updated_at": row.updated_at.isoformat(),
                }
                for row in rows
            ],
        }
    )


@router.get("/memory", response_model=ApiResponse)
def memory_summary(db: Session = Depends(get_database_session)) -> ApiResponse:
    total = db.query(func.count(MemoryEntry.id)).scalar() or 0
    active = (
        db.query(func.count(MemoryEntry.id))
        .filter(MemoryEntry.deleted.is_(False))
        .scalar()
        or 0
    )
    return ApiResponse(data={"total": int(total), "active": int(active)})


@router.get("/nodes", response_model=ApiResponse)
async def list_nodes(config=Depends(get_config), detector=Depends(get_hardware_detector)) -> ApiResponse:
    profile = detector.detect()
    return ApiResponse(
        data={
            "nodes": [
                {
                    "id": config.node_id,
                    "hostname": profile.hostname,
                    "status": "ONLINE",
                    "cpu": profile.cpu.model,
                    "ram_gb": profile.total_ram_gb,
                    "gpu_count": len(profile.gpus),
                }
            ]
        }
    )


@router.get("/tools", response_model=ApiResponse)
async def list_tools() -> ApiResponse:
    return ApiResponse(
        data={
            "tools": [
                {
                    "id": "system.info",
                    "name": "System Information",
                    "permissions": ["system.read"],
                    "enabled": True,
                },
                {
                    "id": "file.list",
                    "name": "Approved File Listing",
                    "permissions": ["file.read"],
                    "enabled": True,
                },
                {
                    "id": "time.now",
                    "name": "Date and Time",
                    "permissions": ["system.read"],
                    "enabled": True,
                },
            ]
        }
    )


@router.get("/skills", response_model=ApiResponse)
def list_skills() -> ApiResponse:
    skills_dir = Path(__file__).resolve().parents[2] / "skills"
    items = [p.name for p in skills_dir.glob("*") if p.is_file()]
    return ApiResponse(data={"count": len(items), "items": items})


@router.get("/agents", response_model=ApiResponse)
def list_agents() -> ApiResponse:
    agents_dir = Path(__file__).resolve().parents[2] / "agents"
    items = [p.name for p in agents_dir.glob("*") if p.is_file()]
    return ApiResponse(data={"count": len(items), "items": items})


@router.get("/files", response_model=ApiResponse)
def list_files(config=Depends(get_config)) -> ApiResponse:
    workspace_dir = (Path(__file__).resolve().parents[3] / config.paths.workspace_dir).resolve()
    workspace_dir.mkdir(parents=True, exist_ok=True)
    entries = [
        {
            "name": p.name,
            "type": "dir" if p.is_dir() else "file",
            "size": p.stat().st_size if p.is_file() else 0,
        }
        for p in sorted(workspace_dir.iterdir(), key=lambda x: x.name.lower())
    ]
    return ApiResponse(data={"root": workspace_dir.as_posix(), "entries": entries})


@router.get("/updates", response_model=ApiResponse)
async def updates_status(config=Depends(get_config)) -> ApiResponse:
    return ApiResponse(
        data={
            "current_version": config.version,
            "channel": "stable",
            "auto_update_policy": "AUTO_CHECK_HOURLY",
            "auto_update_reference": "GitHub Actions + local scheduled sync task",
            "auto_updates": [
                {
                    "name": "Auto Updates: Hourly Health Check",
                    "description": "Runs every hour in GitHub Actions to validate backend tests and frontend build health.",
                    "reference": ".github/workflows/hourly-health-check.yml",
                    "status": "ACTIVE",
                },
                {
                    "name": "Auto Updates: Encrypted Local Sync",
                    "description": "Runs hourly via Windows Task Scheduler and creates encrypted runtime snapshots.",
                    "reference": "scripts/setup-hourly-sync.ps1",
                    "status": "ACTIVE",
                },
                {
                    "name": "Auto Updates: Pull Validate Push",
                    "description": "Pulls latest main, runs tests/build, and pushes only validated updates.",
                    "reference": "scripts/sync-validate-push.ps1",
                    "status": "ACTIVE",
                },
            ],
            "update_available": False,
        }
    )


@router.get("/logs", response_model=ApiResponse)
def list_logs(config=Depends(get_config)) -> ApiResponse:
    logs_dir = (Path(__file__).resolve().parents[3] / config.paths.logs_dir).resolve()
    logs_dir.mkdir(parents=True, exist_ok=True)
    logs = [
        {
            "name": p.name,
            "size": p.stat().st_size,
            "modified": p.stat().st_mtime,
        }
        for p in sorted(logs_dir.glob("*.log"), key=lambda x: x.name.lower())
    ]
    return ApiResponse(data={"count": len(logs), "logs": logs})


@router.get("/security", response_model=ApiResponse)
async def security_status(config=Depends(get_config)) -> ApiResponse:
    return ApiResponse(
        data={
            "localhost_only": config.bind_localhost_only,
            "auth_mode": "DISABLED_LOCAL_ONLY",
            "backup_encryption": config.backup.enabled,
            "notes": "Authentication and role policies are scheduled for next milestone.",
        }
    )
