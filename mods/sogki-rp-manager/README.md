# Sogki Resource Pack Manager (Fabric 1.21.1)

Client-side Fabric mod that prompts players on join to fetch and download multiple server resource packs.

## Features

- Prompt screen on join (custom Minecraft GUI screen)
- Pulls currently active packs from `https://sogki.dev/api/resourcepacks/active`
- Scrollable list of active packs in GUI
- Download each pack individually **or** one-click **Download All**
- SHA1 validation (when source returns `sha1`)
- Downloads to local `.minecraft/resourcepacks`

## Config file

Saved at:

- `.minecraft/config/sogki-rp-manager.json`

Default:

```json
{
  "promptOnJoin": true,
  "activeEndpoint": "https://sogki.dev/api/resourcepacks/active"
}
```

## Build

From this folder:

```bash
./gradlew build
```

Built jar:

- `build/libs/sogki-rp-manager-<version>.jar`

## Notes

- This mod downloads packs; players still enable packs in Minecraft's Resource Packs screen.
- Your backend endpoint `/api/resourcepacks/:id` already supports direct download via 302 redirect.
