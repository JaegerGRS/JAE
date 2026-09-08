$ErrorActionPreference = "Stop"

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

Push-Location frontend
if (!(Test-Path .\node_modules)) {
  npm install
}
npm run tauri:build
Pop-Location

Write-Host "Built native MSI app. Install from frontend/src-tauri/target/release/bundle/msi"
