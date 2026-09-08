$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

Push-Location frontend
npm run build
Pop-Location

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run preview -- --host 127.0.0.1 --port 4173"

Push-Location desktop
if (!(Test-Path .\node_modules)) {
  npm install
}
npm run start
Pop-Location
