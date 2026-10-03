from __future__ import annotations

import re
import socket
import ssl
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.config import get_settings
from api.models import Finding, Scan, Target
from scanner.engine.dns_lookup import lookup_dns
from scanner.engine.email_auth import lookup_email_auth
from scanner.engine.http_client import fetch_observation
from scanner.engine.url import UrlValidationError, host_from_url, validate_and_normalise_url

SECURITY_HEADER_NOTES = {
    "content-security-policy": "Controls which resources the browser may load.",
    "strict-transport-security": "Forces HTTPS after the first trusted visit.",
    "x-content-type-options": "Disables MIME sniffing when set to nosniff.",
    "x-frame-options": "Controls whether the page may be framed.",
    "referrer-policy": "Limits referrer data sent on navigations/requests.",
    "permissions-policy": "Restricts powerful browser features.",
    "cross-origin-opener-policy": "Isolates browsing context from cross-origin openers.",
    "cross-origin-resource-policy": "Controls which origins can load this resource.",
    "access-control-allow-origin": "CORS: which origins may read this response.",
    "server": "May disclose software or platform details.",
    "x-powered-by": "Often discloses framework/runtime information.",
}


def resolve_allowlisted_url(db: Session, *, target_id: str | None, url: str | None) -> tuple[Target, str]:
    if not target_id:
        raise ValueError("target_id is required")
    target = db.get(Target, target_id)
    if not target:
        raise ValueError("Target not found")

    settings_url = url.strip() if url else target.url
    try:
        normalised = validate_and_normalise_url(settings_url)
    except UrlValidationError as exc:
        raise ValueError(str(exc)) from exc

    if host_from_url(normalised) != host_from_url(target.url):
        raise ValueError("URL host is not on the authorised target allowlist entry")
    return target, normalised


def tool_headers(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    obs = fetch_observation(
        normalised,
        timeout=settings.sentinel_request_timeout_seconds,
        max_redirects=settings.sentinel_max_redirects,
        user_agent=settings.sentinel_user_agent,
    )
    annotated = []
    for key, value in sorted(obs.headers.items()):
        annotated.append(
            {
                "name": key,
                "value": value,
                "note": SECURITY_HEADER_NOTES.get(key, "Observed response header."),
                "security_relevant": key in SECURITY_HEADER_NOTES,
            }
        )
    missing = [
        {"name": name, "note": note}
        for name, note in SECURITY_HEADER_NOTES.items()
        if name.startswith(("content-", "strict-", "x-content", "x-frame", "referrer", "permissions", "cross-origin"))
        and name not in obs.headers
    ]
    return {
        "requested_url": obs.requested_url,
        "final_url": obs.final_url,
        "status_code": obs.status_code,
        "error": obs.error,
        "headers": annotated,
        "missing_security_headers": missing,
    }


def tool_redirects(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    # Prefer starting from http variant when saved target is https so redirect map is useful
    start = normalised
    parsed = urlparse(normalised)
    if parsed.scheme == "https":
        start = normalised.replace("https://", "http://", 1)

    obs = fetch_observation(
        start,
        timeout=settings.sentinel_request_timeout_seconds,
        max_redirects=settings.sentinel_max_redirects,
        user_agent=settings.sentinel_user_agent,
    )
    hops = list(obs.redirect_chain)
    hops.append(
        {
            "url": obs.final_url,
            "status_code": obs.status_code,
            "location": None,
            "final": True,
        }
    )
    return {
        "start_url": start,
        "final_url": obs.final_url,
        "error": obs.error,
        "hop_count": max(len(hops) - 1, 0),
        "hops": hops,
    }


def inspect_tls_details(url: str, timeout: float = 10.0) -> dict:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        return {
            "ok": False,
            "error": "TLS inspection requires an https:// URL",
            "host": parsed.hostname,
        }
    host = parsed.hostname
    port = parsed.port or 443
    if not host:
        return {"ok": False, "error": "Missing hostname"}

    context = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                version = ssock.version()
                cipher = ssock.cipher()
    except ssl.SSLCertVerificationError as exc:
        return {
            "ok": False,
            "host": host,
            "port": port,
            "error": f"Certificate validation failed: {exc.__class__.__name__}",
        }
    except OSError as exc:
        return {
            "ok": False,
            "host": host,
            "port": port,
            "error": f"Handshake failed: {exc.__class__.__name__}",
        }

    if not cert:
        return {"ok": False, "host": host, "port": port, "error": "No peer certificate", "tls_version": version}

    subject = dict(x[0] for x in cert.get("subject", []))
    issuer = dict(x[0] for x in cert.get("issuer", []))
    san = [v for t, v in cert.get("subjectAltName", ()) if t == "DNS"]
    not_after = cert.get("notAfter")
    days_remaining = None
    if not_after:
        try:
            expires = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            days_remaining = (expires - datetime.now(timezone.utc)).days
        except ValueError:
            days_remaining = None

    return {
        "ok": True,
        "host": host,
        "port": port,
        "tls_version": version,
        "cipher": {"name": cipher[0], "protocol": cipher[1], "bits": cipher[2]} if cipher else None,
        "subject": subject,
        "issuer": issuer,
        "subject_alt_names": san,
        "not_after": not_after,
        "days_remaining": days_remaining,
        "validated": True,
    }


def tool_tls(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    details = inspect_tls_details(normalised, timeout=settings.sentinel_request_timeout_seconds)
    details["url"] = normalised
    return details


def tool_disclosure(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    base = normalised if normalised.endswith("/") else normalised.rsplit("/", 1)[0] + "/"
    paths = {
        "robots.txt": "robots.txt",
        "security.txt": ".well-known/security.txt",
        "sitemap.xml": "sitemap.xml",
    }
    results = []
    with httpx.Client(
        timeout=settings.sentinel_request_timeout_seconds,
        follow_redirects=True,
        headers={"User-Agent": settings.sentinel_user_agent},
    ) as client:
        for label, path in paths.items():
            fetch_url = urljoin(base, path)
            try:
                res = client.get(fetch_url)
                body = res.text[:4000] if res.text else ""
                notes = _disclosure_notes(label, res.status_code, body)
                results.append(
                    {
                        "name": label,
                        "url": fetch_url,
                        "status_code": res.status_code,
                        "bytes": len(res.content),
                        "body_preview": body,
                        "notes": notes,
                        "error": None,
                    }
                )
            except httpx.HTTPError as exc:
                results.append(
                    {
                        "name": label,
                        "url": fetch_url,
                        "status_code": None,
                        "bytes": 0,
                        "body_preview": "",
                        "notes": ["Fetch failed — no conclusion drawn."],
                        "error": exc.__class__.__name__,
                    }
                )
    return {"base_url": base, "files": results}


def _disclosure_notes(label: str, status: int, body: str) -> list[str]:
    notes: list[str] = []
    if status == 404:
        notes.append(f"{label} not found (404).")
        return notes
    if status != 200:
        notes.append(f"Unexpected status {status}.")
        return notes
    if not body.strip():
        notes.append("Empty 200 response.")
        return notes
    if label == "robots.txt":
        disallows = [line for line in body.splitlines() if line.lower().startswith("disallow:")]
        notes.append(f"Found {len(disallows)} Disallow directive(s).")
        notes.append("Disallow entries are hints for crawlers, not access control.")
    elif label == "security.txt":
        for field in ("Contact:", "Expires:", "Policy:"):
            if any(line.lower().startswith(field.lower()) for line in body.splitlines()):
                notes.append(f"Contains {field[:-1]} field.")
        if not notes:
            notes.append("Present, but common security.txt fields were not detected.")
    elif label == "sitemap.xml":
        url_count = body.lower().count("<url>")
        notes.append(f"Approximate <url> entries in preview: {url_count}.")
        notes.append("Sitemaps may disclose content inventory paths.")
    return notes


def list_target_options(db: Session) -> list[Target]:
    return list(db.scalars(select(Target).order_by(Target.name.asc())))


def tool_dns(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    host = host_from_url(normalised)
    if not host:
        raise ValueError("Could not determine hostname")
    return lookup_dns(host)


def tool_email_auth(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    host = host_from_url(normalised)
    if not host:
        raise ValueError("Could not determine hostname")
    return lookup_email_auth(host)


def tool_csp(db: Session, *, target_id: str | None, url: str | None) -> dict:
    headers = tool_headers(db, target_id=target_id, url=url)
    csp_header = next(
        (h["value"] for h in headers["headers"] if h["name"] == "content-security-policy"),
        None,
    )
    report_only = next(
        (
            h["value"]
            for h in headers["headers"]
            if h["name"] == "content-security-policy-report-only"
        ),
        None,
    )
    policy = csp_header or report_only
    issues: list[dict] = []
    directives: dict[str, list[str]] = {}
    if not policy:
        issues.append(
            {
                "severity": "medium",
                "title": "No CSP header",
                "detail": "Neither Content-Security-Policy nor report-only was present.",
            }
        )
    else:
        for part in policy.split(";"):
            part = part.strip()
            if not part:
                continue
            name, _, rest = part.partition(" ")
            tokens = [t.strip("'\"") for t in rest.split() if t]
            directives[name.lower()] = tokens
        if "default-src" not in directives and "script-src" not in directives:
            issues.append(
                {
                    "severity": "medium",
                    "title": "Missing default-src and script-src",
                    "detail": "No clear script loading policy was found.",
                }
            )
        for name, values in directives.items():
            joined = " ".join(values)
            if "unsafe-inline" in values:
                issues.append(
                    {
                        "severity": "medium",
                        "title": f"{name} allows unsafe-inline",
                        "detail": joined,
                    }
                )
            if "unsafe-eval" in values:
                issues.append(
                    {
                        "severity": "medium",
                        "title": f"{name} allows unsafe-eval",
                        "detail": joined,
                    }
                )
            if "*" in values:
                issues.append(
                    {
                        "severity": "medium",
                        "title": f"{name} contains wildcard *",
                        "detail": joined,
                    }
                )
        if "frame-ancestors" not in directives:
            issues.append(
                {
                    "severity": "low",
                    "title": "Missing frame-ancestors",
                    "detail": "Clickjacking controls may rely only on X-Frame-Options.",
                }
            )
    return {
        "final_url": headers["final_url"],
        "csp": csp_header,
        "csp_report_only": report_only,
        "directives": directives,
        "issues": issues,
        "mode": "enforcing" if csp_header else ("report-only" if report_only else "absent"),
    }


def tool_cookies(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    obs = fetch_observation(
        normalised,
        timeout=settings.sentinel_request_timeout_seconds,
        max_redirects=settings.sentinel_max_redirects,
        user_agent=settings.sentinel_user_agent,
    )
    https = obs.final_url.lower().startswith("https://")
    cookies = []
    for cookie in obs.cookies:
        notes = []
        if https and not cookie.get("secure"):
            notes.append("Missing Secure on HTTPS response.")
        if not cookie.get("httponly"):
            notes.append("Missing HttpOnly — readable by script if XSS exists.")
        samesite = str(cookie.get("samesite") or "")
        if not samesite:
            notes.append("Missing SameSite.")
        elif samesite.lower() == "none" and not cookie.get("secure"):
            notes.append("SameSite=None requires Secure.")
        name = str(cookie.get("name") or "")
        if name.startswith("__Host-"):
            if cookie.get("path") not in ("/", None) or cookie.get("domain"):
                notes.append("__Host- prefix rules may be violated.")
        if name.startswith("__Secure-") and not cookie.get("secure"):
            notes.append("__Secure- prefix requires Secure.")
        cookies.append({**cookie, "notes": notes})
    return {
        "final_url": obs.final_url,
        "status_code": obs.status_code,
        "cookies": cookies,
        "count": len(cookies),
    }


def tool_methods(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    methods = ["OPTIONS", "HEAD", "GET"]
    results = []
    with httpx.Client(
        timeout=settings.sentinel_request_timeout_seconds,
        follow_redirects=False,
        headers={"User-Agent": settings.sentinel_user_agent},
    ) as client:
        for method in methods:
            try:
                res = client.request(method, normalised)
                results.append(
                    {
                        "method": method,
                        "status_code": res.status_code,
                        "allow": res.headers.get("allow"),
                        "error": None,
                    }
                )
            except httpx.HTTPError as exc:
                results.append(
                    {
                        "method": method,
                        "status_code": None,
                        "allow": None,
                        "error": exc.__class__.__name__,
                    }
                )
    return {
        "url": normalised,
        "probed": methods,
        "results": results,
        "limitations": "Only OPTIONS/HEAD/GET are probed. TRACE/CONNECT and verb fuzzing are out of scope.",
    }


class _AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {k: (v or "") for k, v in attrs}
        if tag == "script" and attr.get("src"):
            self.assets.append({"kind": "script", "url": attr["src"]})
        elif tag == "link" and attr.get("href"):
            rel = attr.get("rel", "").lower()
            kind = "style" if "stylesheet" in rel else "link"
            if "icon" in rel:
                kind = "icon"
            self.assets.append({"kind": kind, "url": attr["href"]})
        elif tag == "img" and attr.get("src"):
            self.assets.append({"kind": "img", "url": attr["src"]})
        elif tag in {"iframe", "source", "video", "audio"} and attr.get("src"):
            self.assets.append({"kind": tag, "url": attr["src"]})


def tool_assets(db: Session, *, target_id: str | None, url: str | None) -> dict:
    _target, normalised = resolve_allowlisted_url(db, target_id=target_id, url=url)
    settings = get_settings()
    with httpx.Client(
        timeout=settings.sentinel_request_timeout_seconds,
        follow_redirects=True,
        headers={"User-Agent": settings.sentinel_user_agent},
    ) as client:
        res = client.get(normalised)
        html = res.text[:500_000]
        final = str(res.url)
    parser = _AssetParser()
    try:
        parser.feed(html)
    except Exception:
        pass
    page_host = host_from_url(final) or ""
    inventory = []
    for asset in parser.assets:
        abs_url = urljoin(final, asset["url"])
        asset_host = host_from_url(abs_url) or ""
        third_party = bool(asset_host) and asset_host != page_host
        mixed = final.startswith("https://") and abs_url.startswith("http://")
        inventory.append(
            {
                **asset,
                "absolute_url": abs_url,
                "host": asset_host,
                "third_party": third_party,
                "mixed_content": mixed,
            }
        )
    return {
        "final_url": final,
        "page_host": page_host,
        "assets": inventory[:200],
        "third_party_count": sum(1 for a in inventory if a["third_party"]),
        "mixed_content_count": sum(1 for a in inventory if a["mixed_content"]),
    }


def tool_hsts_preload(db: Session, *, target_id: str | None, url: str | None) -> dict:
    headers = tool_headers(db, target_id=target_id, url=url)
    hsts = next(
        (h["value"] for h in headers["headers"] if h["name"] == "strict-transport-security"),
        None,
    )
    checks = []
    https = str(headers["final_url"]).startswith("https://")
    checks.append({"name": "Served over HTTPS", "pass": https, "detail": headers["final_url"]})
    checks.append({"name": "HSTS header present", "pass": bool(hsts), "detail": hsts or "missing"})
    max_age = 0
    include_sub = False
    preload = False
    if hsts:
        m = re.search(r"max-age=(\d+)", hsts, re.I)
        max_age = int(m.group(1)) if m else 0
        include_sub = "includesubdomains" in hsts.lower()
        preload = "preload" in hsts.lower()
    checks.append(
        {
            "name": "max-age >= 31536000 (1 year)",
            "pass": max_age >= 31536000,
            "detail": f"max-age={max_age}",
        }
    )
    checks.append({"name": "includeSubDomains", "pass": include_sub, "detail": hsts or ""})
    checks.append({"name": "preload directive", "pass": preload, "detail": hsts or ""})
    ready = all(c["pass"] for c in checks)
    return {
        "final_url": headers["final_url"],
        "hsts": hsts,
        "checks": checks,
        "preload_ready": ready,
        "note": "This is a readiness checklist only — it does not submit to the HSTS preload list.",
    }


def tool_diff(db: Session, *, scan_a: str, scan_b: str) -> dict:
    a = db.get(Scan, scan_a)
    b = db.get(Scan, scan_b)
    if not a or not b:
        raise ValueError("Both scans must exist")
    if a.status != "completed" or b.status != "completed":
        raise ValueError("Both scans must be completed")
    fa = list(db.scalars(select(Finding).where(Finding.scan_id == a.id)))
    fb = list(db.scalars(select(Finding).where(Finding.scan_id == b.id)))
    key = lambda f: (f.title, f.severity, f.category)
    set_a = {key(f): f for f in fa}
    set_b = {key(f): f for f in fb}
    only_a = [
        {"title": f.title, "severity": f.severity, "category": f.category}
        for k, f in set_a.items()
        if k not in set_b
    ]
    only_b = [
        {"title": f.title, "severity": f.severity, "category": f.category}
        for k, f in set_b.items()
        if k not in set_a
    ]
    shared = [
        {"title": f.title, "severity": f.severity, "category": f.category}
        for k, f in set_a.items()
        if k in set_b
    ]
    score_a = a.score
    score_b = b.score
    delta = None
    if score_a is not None and score_b is not None:
        delta = score_b - score_a
    return {
        "scan_a": {
            "id": a.id,
            "target_url": a.target_url,
            "score": score_a,
            "finished_at": a.finished_at.isoformat() if a.finished_at else None,
            "finding_count": len(fa),
        },
        "scan_b": {
            "id": b.id,
            "target_url": b.target_url,
            "score": score_b,
            "finished_at": b.finished_at.isoformat() if b.finished_at else None,
            "finding_count": len(fb),
        },
        "score_delta": delta,
        "only_in_a": only_a,
        "only_in_b": only_b,
        "shared": shared,
    }
