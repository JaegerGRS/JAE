$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

Push-Location frontend
if (!(Test-Path .\node_modules)) {
  npm install
}
npm run tauri:dev
Pop-Location
