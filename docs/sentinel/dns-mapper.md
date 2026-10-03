# DNS Connection Mapper

Passive DNS observation for allowlisted hostnames.

## What it shows

- A / AAAA addresses (including multiple IPs)
- CNAME chain
- NS, MX, TXT, CAA
- PTR for resolved IPv4 addresses when available
- Heuristic CDN / reverse-proxy / hosting hints from known patterns

## What it is not

- Not subdomain brute force
- Not zone transfer / walking
- Not TLS-level proxy detection
- Not a guarantee of every backend IP behind a CDN

Use only on hosts you own or are authorised to assess.
