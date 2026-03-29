param()

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping dev watcher processes (if any)..."

$watchers = Get-CimInstance Win32_Process | Where-Object {
  ($_.CommandLine -like "*watch-and-run.ps1*") -or
  ($_.CommandLine -like "*watch-build-deploy.ps1*")
}

foreach ($proc in $watchers) {
  try {
    Stop-Process -Id $proc.ProcessId -Force
    Write-Host "Stopped watcher PID $($proc.ProcessId)"
  } catch {
  }
}

Write-Host "Stopping dev-server Java process (if any)..."

$javaDev = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match "java" -and
  $_.CommandLine -like "*mods\\sogki-rp-manager\\tools\\dev-server\\test-server*"
}

foreach ($proc in $javaDev) {
  try {
    Stop-Process -Id $proc.ProcessId -Force
    Write-Host "Stopped Java PID $($proc.ProcessId)"
  } catch {
  }
}

Write-Host "Done. Dev watchers/server should now be fully stopped."
