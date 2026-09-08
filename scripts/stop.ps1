$ErrorActionPreference = "SilentlyContinue"

$patterns = @(
	"backend.main:app",
	"uvicorn",
	"vite",
	"npm run dev",
	"npm run tauri:dev",
	"cargo",
	"tauri"
)

Get-CimInstance Win32_Process |
	Where-Object {
		$cmd = $_.CommandLine
		if (-not $cmd) { return $false }
		foreach ($p in $patterns) {
			if ($cmd -like "*$p*") { return $true }
		}
		return $false
	} |
	ForEach-Object {
		Stop-Process -Id $_.ProcessId -Force
	}

Write-Host "Stopped JAE backend/frontend processes (best effort)."
