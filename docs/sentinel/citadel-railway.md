# Citadel (Railway) — hosted Sentinel API

**Citadel** is the deploy codename for the Sentinel FastAPI service on Railway. The admin product UI stays **Sentinel** at `/admin/sentinel`.

## What runs where

| Piece | Host |
| --- | --- |
| Admin UI + Discord OAuth login | Live site (Vercel) + Supabase Edge Function |
| Config / auth secrets / scan data | Supabase (`keys`, `sentinel_*`) |
| Scan API (Citadel) | Railway service rooted at `sentinel/` |

Discord is **login only** — not a scan bot.

## Railway setup

1. New Railway project/service named **`citadel`**.
2. Connect this GitHub repo.
3. Set **Root Directory** to `sentinel` (uses [`railway.toml`](../../sentinel/railway.toml) + Dockerfile).
4. Variables:
   - `DATABASE_URL` — Supabase Postgres connection string (pooler URI is fine)
   - `SENTINEL_SERVICE_SECRET` — long random string
   - Optional: `SENTINEL_CORS_ORIGINS` if you need extra admin origins (defaults include `https://sogki.dev` + local Vite)
5. Deploy, copy the public HTTPS URL (e.g. `https://citadel-production.up.railway.app`).
6. In Supabase `keys`, set public row **`SENTINEL_API_URL`** to that HTTPS URL (no trailing slash).
7. Ensure private `ADMIN_DEV_TOKEN` / `ADMIN_JWT_SECRET` in `keys` match admin auth (Citadel loads them on startup via `DATABASE_URL`).

## Local still works

```bash
cd sentinel
docker compose up --build
# or uvicorn on :8790
```

Leave `SENTINEL_API_URL` as `http://127.0.0.1:8790` for local-only, or point it at Citadel when using the live admin against the hosted API.

## Health

`GET /health` → `{ "status": "ok", "service": "sentinel", "codename": "citadel", "version": "..." }`
