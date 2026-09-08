$ErrorActionPreference = "Stop"

Write-Host "[JAE AI] Auto Updates: pulling latest code..."
git pull --ff-only

if (Test-Path .\.venv\Scripts\python.exe) {
  & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}

if (Test-Path .\frontend\package.json) {
  Push-Location frontend
  npm install
  Pop-Location
}

Write-Host "[JAE AI] Auto Updates complete."
