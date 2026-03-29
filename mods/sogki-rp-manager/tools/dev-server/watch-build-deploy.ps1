param(
  [string]$ConfigPath = ".\dev-server.config.json",
  [int]$DebounceSeconds = 2
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$pathsToWatch = @(
  (Join-Path $projectRoot "src\main\java"),
  (Join-Path $projectRoot "src\main\resources"),
  (Join-Path $projectRoot "build.gradle"),
  (Join-Path $projectRoot "gradle.properties"),
  (Join-Path $projectRoot "settings.gradle")
)

$watchers = @()
$subscriptions = @()
$state = [ordered]@{
  Pending     = $false
  LastChange  = [DateTime]::MinValue
  BuildActive = $false
}

function Add-Watcher {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $isDirectory = (Get-Item -LiteralPath $Path).PSIsContainer
  if ($isDirectory) {
    $watcher = New-Object System.IO.FileSystemWatcher $Path, "*"
    $watcher.IncludeSubdirectories = $true
  } else {
    $parent = Split-Path -Parent $Path
    $leaf = Split-Path -Leaf $Path
    $watcher = New-Object System.IO.FileSystemWatcher $parent, $leaf
    $watcher.IncludeSubdirectories = $false
  }
  $watcher.EnableRaisingEvents = $true
  $script:watchers += $watcher

  $onChange = {
    $shared = $event.MessageData
    $shared.Pending = $true
    $shared.LastChange = [DateTime]::UtcNow
  }

  $script:subscriptions += Register-ObjectEvent -InputObject $watcher -EventName Changed -MessageData $state -Action $onChange
  $script:subscriptions += Register-ObjectEvent -InputObject $watcher -EventName Created -MessageData $state -Action $onChange
  $script:subscriptions += Register-ObjectEvent -InputObject $watcher -EventName Deleted -MessageData $state -Action $onChange
  $script:subscriptions += Register-ObjectEvent -InputObject $watcher -EventName Renamed -MessageData $state -Action $onChange
}

Write-Host "Watching source files for changes..."
foreach ($watchPath in $pathsToWatch) {
  Add-Watcher -Path $watchPath
}

if ($watchers.Count -eq 0) {
  throw "No valid watch paths found under $projectRoot"
}

Write-Host "Auto build+deploy ready."
Write-Host "On file change: runs build-and-deploy.ps1 (debounce ${DebounceSeconds}s)."

try {
  while ($true) {
    Start-Sleep -Milliseconds 500
    if (-not $state.Pending) {
      continue
    }
    if ($state.BuildActive) {
      continue
    }
    $elapsed = ([DateTime]::UtcNow - $state.LastChange).TotalSeconds
    if ($elapsed -lt $DebounceSeconds) {
      continue
    }

    $state.Pending = $false
    $state.BuildActive = $true
    try {
      Write-Host "Change detected. Building and deploying..."
      & (Join-Path $scriptDir "build-and-deploy.ps1") -ConfigPath $ConfigPath
      Write-Host "Build+deploy complete. Waiting for next change..."
    } catch {
      Write-Host "Build+deploy failed: $($_.Exception.Message)"
      Write-Host "Watcher will keep running."
    } finally {
      $state.BuildActive = $false
    }
  }
} finally {
  foreach ($sub in $subscriptions) {
    try { Unregister-Event -SubscriptionId $sub.Id -ErrorAction SilentlyContinue } catch {}
  }
  foreach ($watcher in $watchers) {
    try { $watcher.Dispose() } catch {}
  }
}
