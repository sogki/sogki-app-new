# Sogki Cobblemon Server Features Test Checklist

## Startup

- Server boots with mod loaded and no hard crash.
- `config/sogki-cobblemon/features.json` is created automatically.
- `config/sogki-cobblemon/chat.yml`, `tablist.yml`, and `sidebar.yml` are created automatically.

## Chat / Branding

- Global chat uses configured format from `chat.yml`.
- Branding token `{brand}` is replaced everywhere with configured brand string.
- Admin can run `/sogkiadmin reload` and see updated chat formatting without restart.

## Tablist / Sidebar

- Tablist header/footer appears and refreshes.
- `/sogkiadmin tab preview` updates tablist immediately.
- Sidebar attempts render; if mapping/server stack differs, feature fails gracefully (no crash).

## Area Messaging

- Moving across biomes sends enter/leave messages.
- Entering configured town cuboid sends town message.
- Cooldown prevents spam while moving near borders.

## Daily Rewards

- `/claim` works for players and grants configured reward.
- Second `/claim` on same UTC day is rejected.
- Missing claim beyond grace window resets streak.
- `/claimmenu` shows current streak and claim status.

## Region Protection

- Breaking blocks in protected region is denied for non-op players.
- Placing blocks in protected region is denied for non-op players.
- Mob entities spawned in denied spawn region are removed.
- Op/staff can bypass break/place protections.

## Remote Config

- With `remoteConfig.enabled=false`, local config is used.
- With remote enabled and reachable endpoint, server applies overrides.
- With remote enabled but failed endpoint:
  - `failOpen=true` keeps local config.
  - `failOpen=false` falls back to safe defaults.

## Commands

- Player commands:
  - `/claim`
  - `/claimmenu`
- Admin commands:
  - `/sogkiadmin reload`
  - `/sogkiadmin tab preview`
  - `/sogkiadmin sidebar preview`
  - `/sogkiadmin announce <message>`
