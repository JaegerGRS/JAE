$ErrorActionPreference = "Stop"

$taskName = "JAE-AI-Encrypted-Sync-Hourly"
$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot "secure-sync.ps1")).Path

if (!(Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Runs encrypted JAE AI sync snapshot every hour" -Force | Out-Null

Write-Host "Scheduled task registered: $taskName"
Write-Host "It will run every hour using scripts/secure-sync.ps1"
