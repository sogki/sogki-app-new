# Check limitations

Sentinel prefers honest limitations over misleading certainty.

| Check | What it does | What it does not do |
|-------|--------------|---------------------|
| HTTP/HTTPS | Status, redirects, Server header | No request flooding, no path fuzzing |
| Security headers | Presence/basic CSP weakness notes | No full CSP AST validation |
| Cookies | Secure/HttpOnly/SameSite from Set-Cookie | Cookie values are redacted; no session hijack tests |
| TLS | Certificate trust, expiry, hostname, negotiated version | No cipher brute force, no protocol downgrade attacks |
| CORS | Explains ACAO/ACAC on the observed GET | Does not send crafted Origin/preflight probes |
| Information disclosure | Technology headers, body debug hints, robots.txt, sitemap.xml | No auth bypass, no sensitive-file brute force |
| Email auth DNS | Apex SPF TXT, `_dmarc` DMARC, common DKIM selectors | No policy correctness proof, no mail send, no selector brute force |
| Finding triage | open / accepted / fixed + notes on stored findings | Does not auto-close findings on rescan |

Always obtain authorisation before scanning a host.
