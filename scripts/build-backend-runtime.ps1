param(
  [string]$PythonExe = ".\\.venv\\Scripts\\python.exe"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pythonPath = if ([System.IO.Path]::IsPathRooted($PythonExe)) { $PythonExe } else { Join-Path $root $PythonExe }
$resourceRoot = Join-Path $root "build\tauri-resources"
$backendDist = Join-Path $resourceRoot "backend-runtime"
$appTemplate = Join-Path $resourceRoot "app-template"
$workRoot = Join-Path $root "build\pyinstaller"

if (!(Test-Path $pythonPath)) {
  throw "Python runtime not found at $pythonPath. Run scripts/install.ps1 first."
}

Set-Location $root
& $pythonPath -m pip install pyinstaller | Out-Null

if (Test-Path $backendDist) {
  Remove-Item $backendDist -Recurse -Force
}
if (Test-Path $appTemplate) {
  Remove-Item $appTemplate -Recurse -Force
}
New-Item -ItemType Directory -Path $backendDist | Out-Null
New-Item -ItemType Directory -Path $appTemplate | Out-Null
New-Item -ItemType Directory -Path (Join-Path $appTemplate "data") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $appTemplate "backups") | Out-Null

& $pythonPath -m PyInstaller `
  --noconfirm `
  --clean `
  --name jae-ai-backend `
  --distpath $backendDist `
  --workpath $workRoot `
  --specpath $workRoot `
  --paths $root `
  $root\backend_runtime.py

Copy-Item "$root\config" "$appTemplate\config" -Recurse -Force
Copy-Item "$root\VERSION" "$appTemplate\VERSION" -Force

Write-Host "Backend runtime prepared for Tauri resources."
Write-Host "Runtime folder: $backendDist"
Write-Host "App template folder: $appTemplate"
