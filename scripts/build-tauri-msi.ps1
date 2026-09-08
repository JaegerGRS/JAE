$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (!(Test-Path .\frontend\node_modules)) {
  Push-Location frontend
  npm install
  Pop-Location
}

Push-Location frontend
npm run tauri:build
Pop-Location

Write-Host "Tauri MSI build completed."
Write-Host "Find installers under frontend/src-tauri/target/release/bundle/msi"
