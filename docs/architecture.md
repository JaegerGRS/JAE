# JAE AI Architecture

## Principles
- Local-first and privacy-first.
- Backend-mediated access to inference, never direct frontend-to-model.
- Replaceable inference providers through a stable abstraction.
- Hardware-aware operation through detector + tier selector + router.
- Low idle footprint for single-developer maintainability.

## Milestone 1 Components
- FastAPI API at /api/v1/*.
- SQLite local persistence.
- Hardware detection and tier selection.
- Model manifest and selector.
- Llama.cpp provider via OpenAI-compatible API.
- Streaming chat over SSE.
- React private dashboard for Chat/System/Models/Backup/Settings.
