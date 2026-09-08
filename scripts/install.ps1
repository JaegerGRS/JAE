param(
  [string]$PythonCmd = "python"
)

$ErrorActionPreference = "Stop"

Write-Host "[JAE AI] Installing backend dependencies..."
& $PythonCmd -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "[JAE AI] Installing frontend dependencies..."
Push-Location frontend
npm install
Pop-Location

Write-Host "[JAE AI] Install complete."
