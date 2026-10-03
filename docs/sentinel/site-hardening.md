# sogki.dev header hardening

Security response headers for the portfolio are set in [`vercel.json`](../../vercel.json).

| Finding | Change |
|---------|--------|
| Missing CSP | `Content-Security-Policy` (allows self, Google Fonts, Supabase, local Sentinel API) |
| CORS `*` on HTML | Overridden to `https://www.sogki.dev` (Vercel default for static assets is `*`) |
| Missing X-Content-Type-Options | `nosniff` |
| Missing X-Frame-Options | `SAMEORIGIN` |
| Missing Referrer-Policy | `strict-origin-when-cross-origin` |
| Missing Permissions-Policy | disables unused browser features |
| Missing COOP / CORP | `same-origin` (API routes use `cross-origin` CORP + `*` CORS for public pack/image APIs) |

Public `/api/*` routes keep wildcard CORS intentionally (resource packs / image proxy).

`Server: cloudflare` cannot be removed from this repo — Cloudflare adds it at the edge.

Redeploy the Vercel project for these headers to appear on the live site, then re-scan with Sentinel.
