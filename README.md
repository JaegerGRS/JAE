# JAE

JAE (Jaeger Adaptive Engine) is a private local-first AI desktop app built with Tauri.

## Focus
- Native Windows desktop app delivery through Tauri and MSI.
- Local inference and local data by default.
- GitHub as the source/release/update pipeline for the app code.

## Requirements
- Windows 10/11
- Python 3.12+
- Node.js 20+
- npm

## Quick Start
1. Run `scripts/install.ps1`
2. Run `scripts/run-desktop.ps1`

## Hard Purge Workspace
Run `scripts/clean-workspace.ps1` to remove local generated artifacts and runtime leftovers:
- removes local virtual env and node modules
- removes build output and cache folders
- removes local backup snapshot files
- purges local `data/` contents while preserving `data/.gitkeep`

## Development
1. Run `scripts/dev.ps1`
2. Use the Tauri desktop window for development

## Build MSI
1. Run `scripts/build-tauri-msi.ps1`
2. MSI output path: `frontend/src-tauri/target/release/bundle/msi/`

## GitHub Update Pipeline
- CI validation: `.github/workflows/ci.yml`
- Hourly health validation: `.github/workflows/hourly-health-check.yml`
- Windows MSI release build: `.github/workflows/build-tauri-msi.yml`
- Local validated push helper: `scripts/sync-validate-push.ps1`

Use for validated updates:
`scripts/sync-validate-push.ps1 -CommitMessage "feat: app update"`

## Script Set (Kept)
- `scripts/clean-workspace.ps1`
- `scripts/install.ps1`
- `scripts/dev.ps1`
- `scripts/run-desktop.ps1`
- `scripts/build-backend-runtime.ps1`
- `scripts/build-tauri-msi.ps1`
- `scripts/sync-validate-push.ps1`

## Notes
- Model manifest: `config/models.yaml`
- Supporters config: `config/supporters.json`
- Runtime data remains local and is not used as a cloud inference backend.
