$ErrorActionPreference = "Stop"

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
Push-Location frontend
npm run build
Pop-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run preview -- --host 127.0.0.1 --port 4173"
Write-Host "JAE AI started: backend http://127.0.0.1:8000 , frontend http://127.0.0.1:4173"
