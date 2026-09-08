$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[JAE] Cleaning local generated artifacts..."

$pathsToRemove = @(
  ".venv",
  ".pytest_cache",
  "frontend/node_modules",
  "frontend/dist",
  "frontend/src-tauri/target",
  "build/pyinstaller",
  "build/tauri-resources/backend-runtime/jae-ai-backend",
  "build/tauri-resources/app-template/config",
  "build/tauri-resources/app-template/VERSION"
)

foreach ($path in $pathsToRemove) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
  }
}

Get-ChildItem -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

Get-ChildItem -Path "backups" -File -Include "*.jxbak", "*.meta.json" -ErrorAction SilentlyContinue |
  Remove-Item -Force

if (Test-Path "data") {
  Get-ChildItem "data" -Force | Where-Object { $_.Name -ne ".gitkeep" } | Remove-Item -Recurse -Force
}

Write-Host "[JAE] Local workspace cleanup complete."