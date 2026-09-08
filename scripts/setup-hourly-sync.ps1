$ErrorActionPreference = "Stop"

$taskName = "JAE-AI-Encrypted-Sync-Hourly"
$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot "secure-sync.ps1")).Path

if (!(Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
schtasks.exe /Create /TN $taskName /SC HOURLY /MO 1 /TR $taskCommand /F | Out-Null

Write-Host "Scheduled task registered: $taskName"
Write-Host "It will run every hour using scripts/secure-sync.ps1"
