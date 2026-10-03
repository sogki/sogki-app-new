# Lab fixtures

Local demo targets for Sentinel without touching production hosts.

## Start

```bash
cd sentinel
py -3 labfixtures/server.py
```

Or via Compose (binds `127.0.0.1:8791`):

```bash
cd sentinel
docker compose up labfixtures
```

## Targets to save in Sentinel

| URL | Purpose |
|-----|---------|
| `http://127.0.0.1:8791/` | Weak headers, `ACAO:*`, mixed/third-party assets |
| `http://127.0.0.1:8791/secure` | Stronger header set for contrast |

Then open Scanner, Header Lab, Cookie Lab, Asset Inventory, Method Probe, etc.

## DNS note

DNS Mapper against `127.0.0.1` is not meaningful for public DNS demos — use an allowlisted public hostname you own for DNS labs.
