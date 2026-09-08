from __future__ import annotations

from pathlib import Path

from backend.backup.service import BackupService
from backend.chat.service import ChatService
from backend.core.config import AppConfig, ConfigLoader
from backend.database.session import build_engine, build_session_factory, get_db, initialize_database
from backend.hardware.detector import HardwareDetector
from backend.hardware.tiers import HardwareTierSelector
from backend.inference.factory import InferenceProviderFactory
from backend.models.manifest import ModelManifestLoader
from backend.models.download_manager import ModelDownloadManager
from backend.models.selector import ModelSelector

PROJECT_ROOT = Path(__file__).resolve().parents[2]

_loader = ConfigLoader(PROJECT_ROOT)
_config = _loader.load()

_engine = build_engine(PROJECT_ROOT / _config.paths.data_dir / "jae_ai.sqlite3")
_session_factory = build_session_factory(_engine)
initialize_database(_engine)

_hardware_detector = HardwareDetector()
_tier_selector = HardwareTierSelector(PROJECT_ROOT / "config" / "hardware-tiers.yaml")
_manifest_loader = ModelManifestLoader(PROJECT_ROOT / "config" / "models.yaml")
_model_selector = ModelSelector()
_provider = InferenceProviderFactory.build(_config)
_chat_service = ChatService(_provider)
_backup_service = BackupService(PROJECT_ROOT, _config)
_download_manager = ModelDownloadManager(
    PROJECT_ROOT / _config.paths.models_dir,
    _manifest_loader.load(),
    max_concurrent_downloads=_config.downloads.max_concurrent_downloads,
)


async def get_config() -> AppConfig:
    return _config


def get_chat_service() -> ChatService:
    return _chat_service


def get_hardware_detector() -> HardwareDetector:
    return _hardware_detector


def get_tier_selector() -> HardwareTierSelector:
    return _tier_selector


def get_manifest_loader() -> ModelManifestLoader:
    return _manifest_loader


def get_model_selector() -> ModelSelector:
    return _model_selector


def get_provider():
    return _provider


def get_backup_service() -> BackupService:
    return _backup_service


def get_download_manager() -> ModelDownloadManager:
    _download_manager.refresh_manifest(_manifest_loader.load())
    return _download_manager


def get_database_session():
    yield from get_db(_session_factory)
