# Sentinel (Citadel)

Private passive security assessment service for the sogki.dev admin ecosystem.

**Citadel** = Railway / Docker deploy codename for this API. The admin UI product name stays **Sentinel**.

**Not a public scanner.** Only assess systems you own, localhost/lab/CTF environments, or systems where you have explicit permission.

## Stack

- FastAPI + SQLAlchemy
- Modular Python scanner (`scanner/checks`)
- SQLite by default (local), Postgres via `DATABASE_URL`
- Local Compose on `127.0.0.1:8790` · hosted as Railway service **`citadel`** (root dir `sentinel`)

## Quick start (local)

```bash
cd sentinel
cp .env.example .env
docker compose up --build
curl http://127.0.0.1:8790/health
```

Without Docker:

```bash
cd sentinel
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn api.main:app --host 127.0.0.1 --port 8790
```

Frontend reads `SENTINEL_API_URL` from Supabase `keys` (default `http://127.0.0.1:8790`).

## Railway (Citadel)

See [docs/sentinel/citadel-railway.md](../docs/sentinel/citadel-railway.md).

## Tests

```bash
cd sentinel
pytest -q
```

## Trust model

- Admin UI authenticates with Discord OAuth → admin JWT.
- Citadel accepts that bearer (or shared tokens from `keys` / env).
- Scans only run against saved allowlisted targets.
- Checks are passive: HTTP/HTTPS, headers, cookies, TLS cert facts, public metadata, CORS headers, DNS observation.
