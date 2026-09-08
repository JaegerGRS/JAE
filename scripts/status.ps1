Write-Host "Python processes:"
Get-Process | Where-Object { $_.ProcessName -match "python" } | Select-Object Id, ProcessName, CPU
Write-Host "Node processes:"
Get-Process | Where-Object { $_.ProcessName -match "node" } | Select-Object Id, ProcessName, CPU
