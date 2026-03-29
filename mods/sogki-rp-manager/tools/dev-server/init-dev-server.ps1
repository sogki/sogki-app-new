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

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

$cfg = Read-Config -Path $ConfigPath
$testRoot = $cfg.testServerRoot
$testMods = Join-Path $testRoot "mods"
$testConfig = Join-Path $testRoot "config"

if (-not (Test-Path -LiteralPath $cfg.sourceModsPath)) {
  throw "sourceModsPath does not exist: $($cfg.sourceModsPath)"
}
if ($cfg.syncConfigOnInit -and -not (Test-Path -LiteralPath $cfg.sourceConfigPath)) {
  throw "sourceConfigPath does not exist: $($cfg.sourceConfigPath)"
}

Ensure-Dir -Path $testRoot
Ensure-Dir -Path $testMods
Ensure-Dir -Path $testConfig
Ensure-Dir -Path (Join-Path $testRoot "logs")

# Always keep EULA accepted on dev instance only.
Set-Content -LiteralPath (Join-Path $testRoot "eula.txt") -Value "eula=true`n" -Encoding ASCII

Write-Host "Syncing mods into isolated dev server..."
Get-ChildItem -LiteralPath $cfg.sourceModsPath -File | ForEach-Object {
  $name = $_.Name
  if ($name -match "^sogki-rp-manager-.*\.jar$") {
    return
  }
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $testMods $name) -Force
}

if ($cfg.syncConfigOnInit) {
  Write-Host "Syncing config into isolated dev server..."
  Get-ChildItem -LiteralPath $cfg.sourceConfigPath -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $testConfig $_.Name) -Force
  }
}

Write-Host ""
Write-Host "Dev server initialized at: $testRoot"
Write-Host "No files in your main server are modified by this script."
Write-Host "Next: run .\build-and-deploy.ps1 then .\watch-and-run.ps1"
