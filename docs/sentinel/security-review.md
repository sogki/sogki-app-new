# Sentinel security review (private tool)

## Controls in place

- Single-user admin auth gate before UI access
- Scan API requires bearer token; bound to `127.0.0.1` in Docker Compose
- Target allowlist required before outbound assessment
- Cookie values redacted in findings
- Structured logs omit passwords/tokens/secrets
- RLS enabled on Supabase tables with no anon policies
- Docker: non-root user, `cap_drop: ALL`, `no-new-privileges`, read-only root FS

## Residual risks

- A stolen admin bearer token can drive local scans against allowlisted hosts
- Passive GETs still leave network footprints on targets
- Misconfigured `SENTINEL_ADMIN_TOKENS` could open the local API to any bearer that matches

## Operator checklist

1. Keep Compose port bound to loopback only
2. Rotate `SENTINEL_SERVICE_SECRET` / admin tokens if leaked
3. Only save targets you are authorised to test
4. Never expose `/admin/sentinel` or the scan API publicly
