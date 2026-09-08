$ErrorActionPreference = "Stop"

$taskName = "JAE-Encrypted-Sync-Hourly"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Scheduled task removed: $taskName"
} else {
  Write-Host "Scheduled task not found: $taskName"
}
