$ErrorActionPreference = "Continue"

Write-Host "=== JAE AI Diagnostics ==="
Write-Host "Date: $(Get-Date)"
Write-Host "Host: $env:COMPUTERNAME"
Write-Host "OS: $((Get-CimInstance Win32_OperatingSystem).Caption)"
Write-Host "CPU: $((Get-CimInstance Win32_Processor).Name)"
Write-Host "RAM GB: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2))"
Write-Host "GPU:"
Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | Format-Table -AutoSize

Write-Host "Git status:"
git status --short
