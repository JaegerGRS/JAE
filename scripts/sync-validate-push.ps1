param(
  [string]$CommitMessage = "chore: automated sync/validate/push"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"

if (!(Test-Path $git)) {
  throw "Git executable not found at $git"
}

Set-Location $repoRoot

if (!(Test-Path ".\.venv\Scripts\python.exe")) {
  Write-Host "[bootstrap] Python venv missing. Running scripts/install.ps1..."
  & .\scripts\install.ps1
}

if (!(Test-Path ".\frontend\node_modules")) {
  Write-Host "[bootstrap] Frontend dependencies missing. Installing npm packages..."
  Push-Location frontend
  npm install
  Pop-Location
}

Write-Host "[1/6] Pulling latest from origin/main..."
& $git pull --rebase --autostash origin main

Write-Host "[2/6] Running backend tests..."
& .\.venv\Scripts\python.exe -m pytest

Write-Host "[3/6] Building frontend..."
Push-Location frontend
npm run build
Pop-Location

Write-Host "[4/6] Checking for local changes..."
$status = & $git status --porcelain
if (-not $status) {
  Write-Host "No local changes to commit."
  Write-Host "[5/6] Repository already up to date."
  exit 0
}

Write-Host "[5/6] Committing local changes..."
& $git add -A
& $git commit -m $CommitMessage

Write-Host "[6/6] Pushing to origin/main..."
& $git push origin main

Write-Host "Done. Sync, validation, and push completed successfully."
