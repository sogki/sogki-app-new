# Sogki's Cobblemon (Fabric 1.21.1)

Hybrid Fabric mod:
- Client features for resource pack onboarding and welcome UX.
- Server features for chat formatting, tablist/sidebar, area messaging, daily rewards, and region protections.

## Features

- Client:
  - Prompt screen on join (custom Minecraft GUI screen)
  - Pulls active packs from `https://sogki.dev/api/resourcepacks/active`
  - Download each pack individually or one-click `Download All`
  - First-join and returning-user welcome text + configurable sounds
- Server:
  - Global chat format templates (YAML)
  - Tablist header/footer updates
  - Sidebar updates (best-effort compatibility mode)
  - Daily login streak rewards with `/claim`
  - Area enter/leave messages (biome + configured towns)
  - Region flags for block break/place and mob-spawn suppression
  - Optional remote config override (API/DB JSON)

## Client config file

Saved at:

- `.minecraft/config/sogki-rp-manager.json`

Default:

```json
{
  "promptOnJoin": true,
  "activeEndpoint": "https://sogki.dev/api/resourcepacks/active",
  "welcomeMessageOnJoin": true,
  "welcomeUseActionBar": true,
  "firstJoinMessage": "Welcome to Loafey's Cobblepals!",
  "returningJoinMessage": "Welcome back to Loafey's Cobblepals!",
  "firstJoinSound": "minecraft:entity.player.levelup",
  "returningJoinSound": "minecraft:block.note_block.pling",
  "welcomeSoundVolume": 1.0,
  "welcomeSoundPitch": 1.0
}
```

## Server config files

Saved at:

- `config/sogki-cobblemon/features.json`
- `config/sogki-cobblemon/announcements.json`
- `config/sogki-cobblemon/area.json`
- `config/sogki-cobblemon/streak.json`
- `config/sogki-cobblemon/quiz.json`
- `config/sogki-cobblemon/regions.json`
- `config/sogki-cobblemon/cobbletown.json`
- `config/sogki-cobblemon/messages.json`
- `config/sogki-cobblemon/chat.yml`
- `config/sogki-cobblemon/tablist.yml`
- `config/sogki-cobblemon/sidebar.yml`

Reference examples are included in:

- `config-example/features.json`
- `config-example/announcements.json`
- `config-example/area.json`
- `config-example/streak.json`
- `config-example/quiz.json`
- `config-example/regions.json`
- `config-example/cobbletown.json`
- `config-example/messages.json`
- `config-example/chat.yml`
- `config-example/tablist.yml`
- `config-example/sidebar.yml`

Supported placeholders include:

- `{player}`, `{message}`, `{online}`, `{maxOnline}`, `{world}`
- `{x}`, `{y}`, `{z}`
- `{pokemonCount}` (party + PC total), `{partyCount}`, `{pcCount}`
- `{pokedexCaught}`, `{pokedexSeen}`
- message-specific values like `{day}`, `{count}`, `{label}`, `{region}`, `{town}`, `{status}`, `{pokemon}`, `{question}`, `{answer}`, `{seconds}`, `{rewards}`

Display route toggles for area/town notifications are in `area.json`:

- `showActionBar` (hotbar text)
- `showChat` (chat message)
- `showTitle` (center-screen title)
- Edit area entry/leave text in `area.json` via `enterTemplate` and `leaveTemplate`.

Tablist now supports multi-line layout like sidebar:

- `tablist.header` is a YAML list of lines
- `tablist.footer` is a YAML list of lines
- Blank list items create spacing

Town/region protections:

- `regions.json` supports generic protected regions.
- `cobbletown.json` supports Cobbletown ID mappings with independent protection flags.
- Protections are designed to block breaking/placing/explosives/spawns while still allowing normal right-click interactions (doors, PCs, healing stations).
- `denyCreeperExplosions` and `denyEndermanGrief` are available per region/town (legacy `denyExplosives` remains supported and enables both).
- `regions.protectVillagersFromMobs` blocks villager damage from mob attackers/projectiles without disabling mob spawns.
- `regions.villagersIgnoreZombieFear` makes villagers stop treating nearby zombies as a flee trigger.

Radius mode setup (easy `/locate structure` workflow):

- Set `useRadius: true` in a region/town entry.
- Put `/locate structure` result into `centerX` and `centerZ`.
- Set `radius` (horizontal, in blocks).
- Keep `minY`/`maxY` for vertical bounds.
- If `useRadius` is `false`, classic min/max cuboid bounds are used.

## Commands

- Player:
  - `/claim` - claim daily reward
  - `/claimmenu` - show streak/reward status
  - `/spawn` - teleport to configured server spawn
- Admin (`permission level >= 2`):
  - `/setspawn` - set server spawn to your current location
  - `/sogkiadmin reload`
  - `/sogkiadmin quiz start|skip|status`
  - `/sogkiadmin tab preview`
  - `/sogkiadmin sidebar preview`
  - `/sogkiadmin announce <message>`
  - `/sogkiadmin whereami`
  - `/sogkiadmin checkregion`

## Build

From this folder:

```bash
./gradlew build
```

Built jar:

- `build/libs/sogki-rp-manager-<version>.jar`

## Notes

- The `/claim` command is intentionally short (no namespace prefix).
- Streak rewards use Minecraft item IDs. Namespaced IDs work (`minecraft:*`, `cobblemon:*`, etc.) as long as the item exists on the server.
- Streak rewards support multiple items per day via `streak.json -> rewards[].items[]` (legacy single `itemId/count/label` still works).
- `messages.claimSuccess` can use `{rewards}` to show all granted items for that claim.
- Region features are native to this mod and do not require FAWE.
- Cobbletown detection is implemented as a safe adapter layer; explicit region/town config remains the source of truth.
- This mod downloads packs; players still enable packs in Minecraft's Resource Packs screen.
