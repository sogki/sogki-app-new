# Local Dev Server (Isolated)

This setup gives you a local test server that:
- uses the same modpack/config baseline as your main server,
- auto-restarts when a new `sogki-rp-manager` jar is deployed,
- never mutates your main server files.

## 1) Configure once

From this folder:

1. Copy `dev-server.config.example.json` to `dev-server.config.json`.
2. Edit paths:
   - `testServerRoot` -> isolated local test server root (new folder)
   - `sourceModsPath` -> your main server `mods` folder
   - `sourceConfigPath` -> your main server `config` folder
   - `serverJarName` -> Fabric server jar filename inside `testServerRoot`
   - `javaPath` -> Java 21 binary

## 2) Initialize isolated test server

```powershell
.\init-dev-server.ps1
```

This copies baseline mods/config into `testServerRoot` (copy only; no source deletion/moves).

## 3) Build and deploy this mod to test server

```powershell
.\build-and-deploy.ps1
```

This builds `sogki-rp-manager`, removes old local dev copies of that jar in `testServerRoot\mods`, and copies the newest build.

## 4) Run watcher (auto-restart on new build)

```powershell
.\watch-and-run.ps1
```

Keep this running. When `build-and-deploy.ps1` copies a newer jar, watcher restarts the test server automatically.

## 5) Optional: full auto build + deploy watcher

In a second terminal, run:

```powershell
.\watch-build-deploy.ps1
```

This watches `src/main/java`, `src/main/resources`, and Gradle files.  
On changes, it runs `build-and-deploy.ps1` automatically.

With both watchers running:
- Terminal A: `.\watch-and-run.ps1` (server process + auto-restart)
- Terminal B: `.\watch-build-deploy.ps1` (auto build+deploy on code change)

## Typical workflow

1. Start `.\watch-and-run.ps1`
2. Start `.\watch-build-deploy.ps1` (optional but recommended)
3. Edit code
4. Build+deploy happens automatically
5. Server restarts automatically
6. Join local test instance and verify

## Git / GitHub

The folder `test-server/` (your actual Fabric/Minecraft tree with jars, libraries, and world) is **gitignored** at the repo root. It can exceed GitHub’s file-size limits; keep it local only. Scripts and `dev-server.config.example.json` stay in the repo.

## Safety notes

- These scripts only write inside `testServerRoot`.
- Main server folders are used only as copy sources during init.
- The dev server jar/mod/config/world state stays isolated from production.
