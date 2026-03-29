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
- `config/sogki-cobblemon/discord.json`
- `config/sogki-cobblemon/regions.json`
- `config/sogki-cobblemon/cobbletown.json`
- `config/sogki-cobblemon/teams.json`
- `config/sogki-cobblemon/messages.json`
- `config/sogki-cobblemon/skill-tree.json`
- `config/sogki-cobblemon/world-events.json`
- `config/sogki-cobblemon/chat.yml`
- `config/sogki-cobblemon/tablist.yml`
- `config/sogki-cobblemon/sidebar.yml`
- `config/sogki-cobblemon/team-messages.yml`
- `config/sogki-cobblemon/team-scoreboard.yml`

Reference examples are included in:

- `config-example/features.json`
- `config-example/announcements.json`
- `config-example/area.json`
- `config-example/streak.json`
- `config-example/quiz.json`
- `config-example/discord.json`
- `config-example/regions.json`
- `config-example/cobbletown.json`
- `config-example/teams.json`
- `config-example/messages.json`
- `config-example/skill-tree.json`
- `config-example/world-events.json`
- `config-example/chat.yml`
- `config-example/tablist.yml`
- `config-example/sidebar.yml`
- `config-example/team-messages.yml`
- `config-example/team-scoreboard.yml`

Supported placeholders include:

- `{player}`, `{message}`, `{online}`, `{maxOnline}`, `{world}`
- `{x}`, `{y}`, `{z}`
- `{pokemonCount}` (party + PC total), `{partyCount}`, `{pcCount}`
- `{pokedexCaught}`, `{pokedexSeen}`
- `{team}`, `{teamDisplay}`, `{teamColor}`, `{teamPoints}`, `{teamRank}`
- `{teamTotalCatches}`, `{teamTotalQuizzes}`, `{teamMissionsCompleted}`
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

Chat formatting in `chat.yml` controls the entire chat line (including the username section).
Example:

- `format: "&8[&r{teamDisplay}&8] &f{player} &8| &7{message}"`

Team scoreboard hologram styling is configured in `team-scoreboard.yml`:

- `teamScoreboard.title`
- `teamScoreboard.blankLineAfterTitle`
- `teamScoreboard.rankLine`
- `teamScoreboard.detailLine`
- `teamScoreboard.showDetailLine`
- `teamScoreboard.lineSpacing`

Town/region protections:

- `regions.json` supports generic protected regions.
- `cobbletown.json` supports Cobbletown ID mappings with independent protection flags.
- Protections are designed to block breaking/placing/explosives/spawns while still allowing normal right-click interactions (doors, PCs, healing stations).
- `denyCreeperExplosions` and `denyEndermanGrief` are available per region/town (legacy `denyExplosives` remains supported and enables both).
- `regions.protectVillagersFromMobs` blocks villager damage from mob attackers/projectiles without disabling mob spawns.
- `regions.villagersIgnoreZombieFear` makes villagers stop treating nearby zombies as a flee trigger.
- `discord.json` can post online/offline status to a Discord channel using a bot token + channel ID.
  - `gatewayEnabled: true` keeps a live Discord Gateway session so the bot appears online while server is up.
  - Credentials are read from Supabase `keys` table (`cobblebot_token`, `cobblebot_channel_id`), not from local config.
  - Lookup source priority: `discord.json` (`supabaseUrl` / `serviceRoleKey`) then server env vars.
  - Env vars still supported: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or `COBBLEBOT_SUPABASE_URL` + `COBBLEBOT_SUPABASE_SERVICE_ROLE_KEY`).
  - Posts are sent as Discord embeds.

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
  - `/team` - show team status
  - `/teams` - open team selection GUI
  - `/missions` - alias for team missions view
  - `/team choose <valor|mystic|instinct>` - pick a team
  - `/team info|missions|top|leave|help`
  - `/skills` - open the skill tree GUI
  - `/skills status` - show points + unlocked nodes in chat
  - `/skills tree` - view node list and requirements
  - `/skills unlock <nodeId>` - unlock a node if requirements/points are met
  - `/skills reset` - refund spent points and clear your unlocked nodes
- Admin (`permission level >= 2`):
  - `/setspawn` - set server spawn to your current location
  - `/sogkiadmin reload`
  - `/sogkiadmin quiz start|skip|status`
  - `/sogkiadmin discord test`
  - `/sogkiadmin tab preview`
  - `/sogkiadmin sidebar preview`
  - `/sogkiadmin announce <message>`
  - `/sogkiadmin whereami`
  - `/sogkiadmin checkregion`
  - `/sogkiadmin scoreboard team help|setup|refresh|delete|reset <CONFIRM>`
  - `/sogkiadmin teamscoreboard help|setup|refresh|delete|reset <CONFIRM>` (alias)
  - `/sogkiadmin skills grant <player> <points>`
  - `/sogkiadmin events status|list|start <eventId>|end`
  - `/sogkiadmin team mission reroll`

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
- Team passive buffs are applied as infinite effects while the player remains on that team.
- `world-events.json` supports real calendar scheduling per event (`events[].schedule[]`) with day-of-week, start time, and duration windows.
- Use `timezone` (IANA name like `UTC`, `Australia/Sydney`) to control how schedule times are interpreted.
- Event windows support repeat patterns like "Saturday 18:00 for 60 minutes" and "Sunday 18:00 for 60 minutes" on the same event.
- Each event can override start/end chat announcements and Discord embed title/description, and can define catch/drop/spawn/mining/skill-point modifiers independently.
- Discord event embeds post to the same bot channel used for online/offline status announcements.
- Skill point gain supports both deterministic milestones (`catchesPerPoint`, etc.) and chance-based procs (`captureChance`, `quizWinChance`, `dailyClaimChance`, `shinyCaptureChance`, `legendaryCaptureChance`, `miningOreChance`) with per-source daily caps.
- Event schedule control:
  - Preferred mode: define `events[].schedule[]` entries for calendar windows.
  - Legacy mode fallback: if no schedule windows are active, rotation still uses `cycleStartEpochDay` + `rotateEveryDays`.
  - Use `/sogkiadmin events start <eventId>` to force one for testing, then `/sogkiadmin events end` to return to schedule mode.
