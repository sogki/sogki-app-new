param(
  [string]$ConfigPath = ".\dev-server.config.json",
  [int]$PollSeconds = 2
)

$ErrorActionPreference = "Stop"

function Read-Config {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Config file not found: $Path. Copy dev-server.config.example.json to dev-server.config.json and edit it."
  }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Resolve-ModJar {
  param([string]$ModsPath)
  return Get-ChildItem -LiteralPath $ModsPath -Filter "sogki-rp-manager-*.jar" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Apply-StagedJarIfPresent {
  param([string]$ModsPath)
  $staged = Get-ChildItem -LiteralPath $ModsPath -Filter "sogki-rp-manager-*.jar.next" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $staged) {
    return
  }
  $activeName = $staged.Name -replace "\.next$",""
  $activePath = Join-Path $ModsPath $activeName
  if (Test-Path -LiteralPath $activePath) {
    Remove-Item -LiteralPath $activePath -Force
  }
  Move-Item -LiteralPath $staged.FullName -Destination $activePath -Force
  Write-Host "Applied staged mod jar: $activeName"
}

function Start-DevServer {
  param(
    [string]$JavaPath,
    [string]$JvmArgs,
    [string]$ServerJar,
    [string]$WorkingDirectory
  )
  $args = @()
  if ($JvmArgs) {
    $args += ($JvmArgs -split "\s+")
  }
  $args += "-jar"
  $args += $ServerJar
  $args += "nogui"

  Write-Host "Starting dev server..."
  return Start-Process -FilePath $JavaPath -ArgumentList $args -WorkingDirectory $WorkingDirectory -PassThru
}

$cfg = Read-Config -Path $ConfigPath
$testRoot = $cfg.testServerRoot
$modsPath = Join-Path $testRoot "mods"
$serverJar = Join-Path $testRoot $cfg.serverJarName

if (-not (Test-Path -LiteralPath $cfg.javaPath)) {
  throw "javaPath not found: $($cfg.javaPath)"
}
if (-not (Test-Path -LiteralPath $serverJar)) {
  throw "Server jar not found in test server root: $serverJar"
}
if (-not (Test-Path -LiteralPath $modsPath)) {
  throw "mods folder not found: $modsPath"
}

$modJar = Resolve-ModJar -ModsPath $modsPath
if (-not $modJar) {
  throw "No sogki-rp-manager jar found in $modsPath. Run build-and-deploy.ps1 first."
}

$lastWrite = $modJar.LastWriteTimeUtc
$proc = Start-DevServer -JavaPath $cfg.javaPath -JvmArgs $cfg.jvmArgs -ServerJar $cfg.serverJarName -WorkingDirectory $testRoot

try {
  while ($true) {
    Start-Sleep -Seconds $PollSeconds
    $latest = Resolve-ModJar -ModsPath $modsPath
    if (-not $latest) {
      continue
    }

    if ($latest.LastWriteTimeUtc -gt $lastWrite) {
      $lastWrite = $latest.LastWriteTimeUtc
      if (-not $proc.HasExited) {
        Write-Host "Detected new mod build. Restarting dev server..."
        Stop-Process -Id $proc.Id -Force
      }
      Start-Sleep -Seconds 1
      Apply-StagedJarIfPresent -ModsPath $modsPath
      $proc = Start-DevServer -JavaPath $cfg.javaPath -JvmArgs $cfg.jvmArgs -ServerJar $cfg.serverJarName -WorkingDirectory $testRoot
      continue
    }

    if ($proc.HasExited) {
      Write-Host "Dev server exited. Restarting..."
      Start-Sleep -Seconds 1
      Apply-StagedJarIfPresent -ModsPath $modsPath
      $proc = Start-DevServer -JavaPath $cfg.javaPath -JvmArgs $cfg.jvmArgs -ServerJar $cfg.serverJarName -WorkingDirectory $testRoot
    }
  }
} finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
