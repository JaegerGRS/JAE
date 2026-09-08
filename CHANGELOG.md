# Changelog

## 0.1.0 - 2026-09-08
- Initial Milestone 1 foundation.
- FastAPI backend with hardware detection, tier selection, model manifest loading, model selection, health/system/models/settings/chat APIs, and SSE streaming.
- React + TypeScript frontend with Chat/System/Models/Backup/Settings MVP pages.
- SQLite schema and local persistence.
- Windows scripts for install/dev/start/stop/restart/status/diagnose/update/restore.
- Initial tests for core backend modules.

## 0.2.0 - 2026-09-08
- Encrypted backup service (create, verify, restore) and backup API endpoints.
- Model download manager with progress tracking, cancellation, and checksum validation.
- Dashboard integration for backup controls and model file download workflow.
- Unit tests for backup roundtrip and model download integrity.
- Signed backup metadata (HMAC-SHA256) validation.
- Encrypted backup export endpoint and dashboard export action.

## 0.2.1 - 2026-09-08
- Added configurable model download queue with max concurrency control.
- Added persistent download job state and interrupted-job recovery markers.
- Added model download jobs API endpoint and dashboard job history table.
- Added backend tests for queueing and state recovery behavior.

## 0.2.2 - 2026-09-08
- Completed full linked app shell for all major control panel sections.
- Unified product branding as JAE AI across app surfaces.
- Fixed CORS for preview and dev frontend ports.
- Replaced deprecated FastAPI startup/shutdown event hooks with lifespan.
- Replaced datetime.utcnow defaults with timezone-aware UTC timestamps.
- Applied high-contrast black-and-white dark theme with subtle white accents for night use.
