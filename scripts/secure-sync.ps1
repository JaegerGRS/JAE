$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$git = "C:\Program Files\Git\cmd\git.exe"
if (!(Test-Path $git)) {
  $git = "C:\Program Files\Git\bin\git.exe"
}
if (!(Test-Path $git)) {
  throw "Git executable not found. Install Git first."
}

if (!(Test-Path .\.venv\Scripts\python.exe)) {
  throw "Virtual env not found. Run scripts/install.ps1 first."
}

# Create an encrypted backup snapshot (jxbak) using the existing backup service.
$backupName = .\.venv\Scripts\python.exe -c "from pathlib import Path; from backend.core.config import ConfigLoader; from backend.backup.service import BackupService; root=Path('.').resolve(); cfg=ConfigLoader(root).load(); svc=BackupService(root, cfg); r=svc.create_backup(None); print(r['name'])"
$backupName = $backupName.Trim()
if ([string]::IsNullOrWhiteSpace($backupName)) {
  throw "Backup creation failed."
}

$backupFile = Join-Path "backups" $backupName
$metaFile = "$backupFile.meta.json"
if (!(Test-Path $backupFile)) {
  throw "Encrypted backup file not found: $backupFile"
}
if (!(Test-Path $metaFile)) {
  throw "Backup metadata file not found: $metaFile"
}

$vaultDir = "vault/snapshots"
New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null

Copy-Item -Path $backupFile -Destination (Join-Path $vaultDir $backupName) -Force
Copy-Item -Path $metaFile -Destination (Join-Path $vaultDir ("$backupName.meta.json")) -Force

# Retain only latest 20 encrypted snapshots in vault.
$files = Get-ChildItem -Path $vaultDir -File | Sort-Object LastWriteTime -Descending
if ($files.Count -gt 40) {
  $files | Select-Object -Skip 40 | Remove-Item -Force
}

& $git add vault/snapshots

$status = & $git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "No encrypted sync changes to commit."
  exit 0
}

$commitMessage = "Encrypted sync snapshot: $backupName"
& $git commit -m $commitMessage
& $git push origin main

Write-Host "Encrypted snapshot pushed to GitHub: $backupName"
