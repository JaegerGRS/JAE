$ErrorActionPreference = "Stop"

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"
Write-Host "Backend and frontend dev servers started in separate terminals."
