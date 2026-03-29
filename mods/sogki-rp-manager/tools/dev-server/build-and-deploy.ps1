param(
  [string]$ConfigPath = ".\dev-server.config.json"
)

$ErrorActionPreference = "Stop"

function Read-Config {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Config file not found: $Path. Copy dev-server.config.example.json to dev-server.config.json and edit it."
  }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

$cfg = Read-Config -Path $ConfigPath
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$testMods = Join-Path $cfg.testServerRoot "mods"

if (-not (Test-Path -LiteralPath $testMods)) {
  throw "Dev server mods folder missing: $testMods. Run init-dev-server.ps1 first."
}

Write-Host "Building mod jar..."
Push-Location $projectRoot
try {
  & ".\gradlew.bat" build
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$libsPath = Join-Path $projectRoot "build\libs"
$jar = Get-ChildItem -LiteralPath $libsPath -Filter "sogki-rp-manager-*.jar" -File |
  Where-Object { $_.Name -notlike "*-sources.jar" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $jar) {
  throw "No built jar found in $libsPath"
}

Write-Host "Deploying $($jar.Name) to isolated dev server mods folder..."
$activeTarget = Join-Path $testMods $jar.Name
$stagedTarget = "$activeTarget.next"

try {
  Get-ChildItem -LiteralPath $testMods -File | Where-Object { $_.Name -match "^sogki-rp-manager-.*\.jar\.next$" } | Remove-Item -Force
} catch {
}

if (Test-Path -LiteralPath $activeTarget) {
  try {
    Copy-Item -LiteralPath $jar.FullName -Destination $activeTarget -Force
    Write-Host "Replaced active jar directly."
  } catch {
    Copy-Item -LiteralPath $jar.FullName -Destination $stagedTarget -Force
    Write-Host "Active jar is locked by running server; staged update written to $([System.IO.Path]::GetFileName($stagedTarget))."
    Write-Host "Watcher will apply it on next restart."
  }
} else {
  Copy-Item -LiteralPath $jar.FullName -Destination $activeTarget -Force
}

Write-Host "Deploy complete."
