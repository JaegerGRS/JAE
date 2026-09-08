$ErrorActionPreference = "Stop"

$taskName = "JAE-AI-Encrypted-Sync-Hourly"

schtasks.exe /Query /TN $taskName > $null 2>&1
if ($LASTEXITCODE -eq 0) {
  schtasks.exe /Delete /TN $taskName /F | Out-Null
  Write-Host "Scheduled task removed: $taskName"
} else {
  Write-Host "Scheduled task not found: $taskName"
}
