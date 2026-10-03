"""Passive SPF / DMARC / common-selector DKIM observation via public DNS TXT."""

from __future__ import annotations

from typing import Any

# Common selectors only — no brute force of arbitrary selector space.
COMMON_DKIM_SELECTORS = (
    "google",
    "selector1",
    "selector2",
    "default",
    "k1",
    "s1",
    "s2",
    "mail",
    "dkim",
    "smtp",
    "email",
    "mx",
)


def _txt_records(name: str) -> list[str]:
    try:
        import dns.exception
        import dns.resolver
    except ImportError:
        return []

    resolver = dns.resolver.Resolver()
    resolver.lifetime = 5.0
    resolver.timeout = 3.0
    try:
        answers = resolver.resolve(name, "TXT")
        out: list[str] = []
        for rdata in answers:
            # dnspython may split long TXT into tuples of strings
            parts = getattr(rdata, "strings", None)
            if parts:
                joined = b"".join(parts).decode("utf-8", errors="replace")
            else:
                joined = rdata.to_text().strip('"')
            out.append(joined)
        return out
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.DNSException):
        return []
    except Exception:
        return []


def apex_from_host(hostname: str) -> str:
    host = hostname.strip(".").lower()
    if host.startswith("www."):
        return host[4:]
    return host


def lookup_email_auth(hostname: str) -> dict[str, Any]:
    apex = apex_from_host(hostname)
    txt = _txt_records(apex)
    spf = [t for t in txt if "v=spf1" in t.lower()]
    dmarc_name = f"_dmarc.{apex}"
    dmarc_txt = _txt_records(dmarc_name)
    dmarc = [t for t in dmarc_txt if "v=dmarc1" in t.lower()]

    dkim_hits: list[dict[str, str]] = []
    for selector in COMMON_DKIM_SELECTORS:
        name = f"{selector}._domainkey.{apex}"
        records = _txt_records(name)
        for rec in records:
            if "v=dkim1" in rec.lower() or "k=" in rec.lower() or "p=" in rec.lower():
                dkim_hits.append({"selector": selector, "name": name, "value": rec})
                break

    issues: list[str] = []
    if not spf:
        issues.append("No SPF TXT record (v=spf1) on the apex domain.")
    if not dmarc:
        issues.append("No DMARC record at _dmarc.<apex> (v=DMARC1).")
    if not dkim_hits:
        issues.append(
            "No DKIM TXT found for common selectors — a custom selector may still exist."
        )

    return {
        "hostname": hostname.strip(".").lower(),
        "apex": apex,
        "spf": {"present": bool(spf), "records": spf},
        "dmarc": {"present": bool(dmarc), "name": dmarc_name, "records": dmarc},
        "dkim": {
            "present": bool(dkim_hits),
            "selectors_checked": list(COMMON_DKIM_SELECTORS),
            "records": dkim_hits,
        },
        "issues": issues,
        "limitations": (
            "Passive public DNS only. Does not validate SPF/DMARC policy correctness, "
            "does not send mail, and only checks a fixed list of common DKIM selectors — "
            "not an exhaustive selector discovery."
        ),
    }
