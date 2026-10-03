"""Passive DNS observation for allowlisted hostnames."""

from __future__ import annotations

import ipaddress
import socket
from typing import Any

INFRASTRUCTURE_HINTS = [
    ("cloudflare", "Cloudflare (CDN / reverse proxy)"),
    ("cdn.cloudflare", "Cloudflare (CDN / reverse proxy)"),
    ("fastly", "Fastly (CDN)"),
    ("vercel-dns", "Vercel"),
    ("vercel.app", "Vercel"),
    ("amazonaws.com", "AWS"),
    ("cloudfront.net", "AWS CloudFront (CDN)"),
    ("azure", "Microsoft Azure"),
    ("akamai", "Akamai (CDN)"),
    ("googleusercontent", "Google infrastructure"),
    ("github.io", "GitHub Pages"),
    ("netlify", "Netlify"),
    ("digitalocean", "DigitalOcean"),
]


def lookup_dns(hostname: str) -> dict[str, Any]:
    """Resolve common record types. Uses dnspython when available, with socket fallback."""
    host = hostname.strip(".").lower()
    result: dict[str, Any] = {
        "hostname": host,
        "records": [],
        "cname_chain": [],
        "addresses": [],
        "ptr": [],
        "infrastructure_hints": [],
        "limitations": (
            "Passive DNS only — no subdomain brute force, zone transfer, or active proxy detection. "
            "CDN/proxy labels are heuristics from public CNAME/NS patterns."
        ),
        "error": None,
    }

    # Literal IPs are not DNS names — return them directly.
    try:
        ip = ipaddress.ip_address(host)
        result["addresses"] = [str(ip)]
        result["cname_chain"] = [host]
        result["records"] = [{"type": "A" if ip.version == 4 else "AAAA", "name": host, "value": str(ip)}]
        result["limitations"] += " Target host is an IP literal, so public DNS name records were skipped."
        return result
    except ValueError:
        pass

    try:
        import dns.exception
        import dns.resolver
        import dns.reversename
    except ImportError:
        return _socket_fallback(host, result, error="dnspython is not installed; used OS resolver fallback")

    resolver = dns.resolver.Resolver()
    resolver.lifetime = 5.0
    resolver.timeout = 3.0

    def query(name: str, rdtype: str) -> list[str]:
        try:
            answers = resolver.resolve(name, rdtype)
            return sorted({rdata.to_text().rstrip(".") for rdata in answers})
        except dns.exception.DNSException:
            return []
        except Exception:
            return []

    # CNAME chain from the requested name
    chain = [host]
    current = host
    for _ in range(8):
        cnames = query(current, "CNAME")
        if not cnames:
            break
        nxt = cnames[0].lower()
        result["records"].append({"type": "CNAME", "name": current, "value": nxt})
        chain.append(nxt)
        current = nxt
    result["cname_chain"] = chain

    # Query both original host and CNAME terminus for addresses
    for name in {host, current}:
        for rdtype in ("A", "AAAA"):
            for value in query(name, rdtype):
                result["records"].append({"type": rdtype, "name": name, "value": value})
                if value not in result["addresses"]:
                    result["addresses"].append(value)

    for rdtype in ("NS", "MX", "TXT", "CAA"):
        for value in query(host, rdtype):
            result["records"].append({"type": rdtype, "name": host, "value": value})
        # Also try apex if host is www.*
        if host.startswith("www."):
            apex = host[4:]
            for value in query(apex, rdtype):
                result["records"].append({"type": rdtype, "name": apex, "value": value})

    # Deduplicate records
    seen: set[tuple[str, str, str]] = set()
    unique_records = []
    for rec in result["records"]:
        key = (rec["type"], rec["name"], rec["value"])
        if key in seen:
            continue
        seen.add(key)
        unique_records.append(rec)
    result["records"] = unique_records

    # OS resolver fallback if dnspython found nothing useful
    if not result["addresses"]:
        fallback = _socket_fallback(host, {**result, "records": list(result["records"])}, error=None)
        if fallback["addresses"]:
            result = fallback
            result["limitations"] += " Some addresses came from the OS resolver fallback."

    if not result["addresses"] and not result["records"]:
        result["error"] = (
            f"No DNS records found for {host}. "
            "Check the hostname, try the apex domain (without www), "
            "or confirm outbound DNS is allowed from the Sentinel API host."
        )

    # PTR for IPv4
    for addr in result["addresses"]:
        if ":" in addr:
            continue
        try:
            rev = dns.reversename.from_address(addr)
            ptrs = query(str(rev), "PTR")
            for ptr in ptrs:
                result["ptr"].append({"ip": addr, "ptr": ptr})
        except Exception:
            continue

    blob = " ".join(
        [r["value"].lower() for r in result["records"]] + [h.lower() for h in result["cname_chain"]]
    )
    hints = []
    for needle, label in INFRASTRUCTURE_HINTS:
        if needle in blob and label not in hints:
            hints.append(label)
    result["infrastructure_hints"] = hints
    return result


def _socket_fallback(host: str, result: dict[str, Any], error: str | None) -> dict[str, Any]:
    result["error"] = error
    result["cname_chain"] = result.get("cname_chain") or [host]
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            addr = info[4][0]
            if addr not in result["addresses"]:
                result["addresses"].append(addr)
                kind = "AAAA" if ":" in addr else "A"
                result["records"].append({"type": kind, "name": host, "value": addr})
    except socket.gaierror as exc:
        result["error"] = result["error"] or f"DNS resolution failed: {exc.strerror or exc.__class__.__name__}"
    return result
