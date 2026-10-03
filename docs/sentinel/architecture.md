# Sentinel architecture

Sentinel is a private security command centre inside `/admin/sentinel`.

**Citadel** is the deploy codename for the hosted scan API (Railway). Discord is used for admin OAuth login only.

## Components

1. **Admin UI** (`src/pages/admin/sentinel`) — React pages in the existing admin shell. Uses Discord/admin auth. Never contacts assessment targets directly.
2. **Scan API / Citadel** (`sentinel/`) — FastAPI service. Locally on `:8790`, or hosted on Railway as service `citadel` (root directory `sentinel`). Validates tokens, enforces target allowlist, persists results.
3. **Scanner engine** (`sentinel/scanner`) — Modular passive checks producing structured findings and a Sentinel Security Score.
4. **Database** — SQLite locally or Supabase Postgres via `DATABASE_URL`. Tables: `sentinel_targets`, `sentinel_scans`, `sentinel_findings`, `sentinel_scan_results`.

## Configuration source of truth

- **`keys.SENTINEL_API_URL`** (`is_public`) — base URL the admin UI uses (local `http://127.0.0.1:8790` or Citadel Railway HTTPS URL).
- **`keys.ADMIN_DEV_TOKEN` / `keys.ADMIN_JWT_SECRET`** (private) — when Citadel has `DATABASE_URL`, it loads these on startup so Discord/admin JWTs work without duplicating secrets into env beyond the DB URL.
- **`DATABASE_URL`** — bootstrap env on the API host for Supabase mode.

See [citadel-railway.md](./citadel-railway.md) for Railway steps.

## Trust boundary

```
Discord OAuth → admin JWT → /admin/sentinel → Citadel API → allowlisted target → findings → Supabase
```

Public portfolio pages may describe Sentinel but must not expose the live tool.

## Non-goals

No public registration, multi-tenant SaaS, mass scanning, malware, credential theft, evasion, DoS, or exploit automation.
