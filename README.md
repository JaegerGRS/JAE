# JAE AI

JAE AI is a local-first, privacy-first, modular AI assistant platform designed for Windows and scalable to stronger hardware and multi-node private deployments.

## Current Status
Current pinned version policy:
- Version remains at 0.0.1 until explicitly changed.

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

Product defaults:
- Files and project data stay local-only by default.
- JAE can browse and scan internet sources for information when tool flows are enabled.
- Selected AI models are open/free to use locally and do not require API keys.
- Supporters can be shown from Ko-fi-linked GitHub usernames via config/supporters.json.

## Requirements
- Windows 10/11
- Python 3.12+
- Node.js 20+
- npm

## Quick Start
1. Run scripts/install.ps1
2. Run scripts/run-desktop.ps1
3. Use JAE AI as a native Windows desktop app

Auto sync and publish workflow:
1. Run scripts/sync-validate-push.ps1
2. Optional: pass a custom commit message, for example:
	scripts/sync-validate-push.ps1 -CommitMessage "feat: ui polish and fixes"

Windows desktop app launcher (Tauri):
1. Run scripts/run-desktop.ps1

Build native MSI installer:
1. Run scripts/build-tauri-msi.ps1
2. MSI output: frontend/src-tauri/target/release/bundle/msi/JAE AI_0.0.1_x64_en-US.msi

## GitHub Release Channel
- This repository includes CI checks at .github/workflows/ci.yml.
- This repository includes an hourly auto update health check at .github/workflows/hourly-health-check.yml.
- This repository includes a Windows Tauri MSI build workflow at .github/workflows/build-tauri-msi.yml.
- GitHub is used as the release, sync, and update channel for the desktop app.
- Live chat, local files, and inference runtime stay inside the Windows app and local machine.
- GitHub is not used as a live inference server or live search backend.

## Encrypted Sync
- Run scripts/secure-sync.ps1 to create and push encrypted backup snapshots.
- Run scripts/setup-hourly-sync.ps1 to install a Windows scheduled task for hourly encrypted sync.
- Run scripts/remove-hourly-sync.ps1 to remove the hourly scheduled task.
- Encrypted snapshots are stored in vault/snapshots and can be restored later.
- Backup encryption keys are local or environment-based and are never committed.
- Important: source code in git remains visible to users with repository access; encrypted sync protects runtime/user data snapshots.

## Auto Updates
- Auto Updates: Hourly Health Check
	Reference: .github/workflows/hourly-health-check.yml
	Description: Runs every hour to verify backend tests and frontend build health.
- Auto Updates: Encrypted Local Sync
	Reference: scripts/setup-hourly-sync.ps1
	Description: Registers an hourly Windows scheduled task for encrypted runtime snapshots.
- Auto Updates: Pull Validate Push
	Reference: scripts/sync-validate-push.ps1
	Description: Pulls latest code, runs tests/build, then pushes only validated changes.

## Supporters
- Supporters page reads from config/supporters.json.
- Add Ko-fi members who linked GitHub by appending their github_username and optional display fields.
- Public GitHub avatars and profile links are generated automatically from the username.

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
- scripts/run-desktop.ps1
- scripts/build-tauri-msi.ps1
- scripts/secure-sync.ps1
- scripts/setup-hourly-sync.ps1
- scripts/remove-hourly-sync.ps1
- scripts/sync-validate-push.ps1

## Troubleshooting
- If chat is unavailable, verify at least one local model is installed and the local inference runtime is online.
- If inference health is offline, start your llama.cpp OpenAI-compatible server and ensure base URL matches config/defaults.yaml.
- Run tests with .\\.venv\\Scripts\\python.exe -m pytest.

## Folder Structure
See docs/architecture.md for architecture and docs/development.md for workflow details.
