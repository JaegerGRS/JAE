# JAE AI

JAE AI is a local-first, privacy-first, modular AI assistant platform designed for Windows and scalable to stronger hardware and multi-node private deployments.

## Current Status
Milestone 1 foundation is implemented, plus initial Milestone 2 capabilities:
- FastAPI backend
- React + TypeScript frontend
- SQLite storage
- hardware detection + tier selection
- model manifest + selection
- inference abstraction with llama.cpp provider
- streaming chat (SSE)
- system and settings dashboard pages
- model download manager with progress/cancel/checksum
- encrypted backup create/verify/restore
- Windows install/dev/start scripts
- core test suite

## Requirements
- Windows 10/11
- Python 3.12+
- Node.js 20+
- npm

## Quick Start
1. Run scripts/install.ps1
2. Run scripts/dev.ps1
3. Open frontend URL printed by Vite (default http://127.0.0.1:5173)

## API
Versioned API prefix:
- /api/v1/health
- /api/v1/version
- /api/v1/system
- /api/v1/conversations
- /api/v1/memory
- /api/v1/models
- /api/v1/models/status
- /api/v1/models/downloads
- /api/v1/models/download
- /api/v1/models/download/{job_id}
- /api/v1/models/download/{job_id}/cancel
- /api/v1/nodes
- /api/v1/tools
- /api/v1/skills
- /api/v1/agents
- /api/v1/files
- /api/v1/settings
- /api/v1/chat
- /api/v1/chat/stream
- /api/v1/backups
- /api/v1/backups/create
- /api/v1/backups/verify
- /api/v1/backups/preflight
- /api/v1/backups/restore
- /api/v1/backups/export
- /api/v1/updates
- /api/v1/logs
- /api/v1/security

## Configuration
Layered configuration order:
1. config/defaults.yaml
2. config/device.local.yaml
3. config/user.local.yaml
4. environment variables

Do not edit defaults.yaml for machine-specific settings.

## Model Installation
- Model manifest lives in config/models.yaml.
- Model binaries must be stored under data/models/ and never committed.
- Replace placeholder SHA256 values before automated download/verification workflows.

## Security Warnings
- Default bind address is localhost only (127.0.0.1).
- Do not commit secrets, tokens, .env, or model binaries.
- Auth and encrypted backup workflows are planned for Milestone 2.

## Scripts
- scripts/install.ps1
- scripts/dev.ps1
- scripts/start.ps1
- scripts/stop.ps1
- scripts/restart.ps1
- scripts/status.ps1
- scripts/diagnose.ps1
- scripts/update.ps1
- scripts/restore.ps1

## Troubleshooting
- If frontend cannot call API, verify backend is running on 127.0.0.1:8000.
- If inference health is offline, start your llama.cpp OpenAI-compatible server and ensure base URL matches config/defaults.yaml.
- Run tests with .\\.venv\\Scripts\\python.exe -m pytest.

## Folder Structure
See docs/architecture.md for architecture and docs/development.md for workflow details.
