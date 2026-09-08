$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  Write-Host "Virtual env not found. Run scripts/install.ps1 first."
  exit 1
}

# Clear stale processes from previous runs that can lock the Rust binary or keep the dev port occupied.
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -like "*$root*" -and
    ($_.Name -match "node|cargo|jae-ai")
  } |
  ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
  }

Push-Location frontend
if (!(Test-Path .\node_modules)) {
  npm install
}
npm run tauri:dev
Pop-Location
