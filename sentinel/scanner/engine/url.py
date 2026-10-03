"""URL validation and normalisation for authorised targets only."""

from __future__ import annotations

from urllib.parse import urlparse, urlunparse


class UrlValidationError(ValueError):
    pass


ALLOWED_SCHEMES = {"http", "https"}


def validate_and_normalise_url(raw: str) -> str:
    if not raw or not raw.strip():
        raise UrlValidationError("URL is required")

    value = raw.strip()
    if "://" not in value:
        value = f"https://{value}"

    parsed = urlparse(value)
    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise UrlValidationError("Only http and https URLs are allowed")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise UrlValidationError("URL must include a hostname")

    if parsed.username or parsed.password:
        raise UrlValidationError("URLs must not include credentials")

    # Reject obvious malformed hosts
    if " " in host or host.startswith(".") or host.endswith("."):
        raise UrlValidationError("Invalid hostname")

    path = parsed.path or "/"
    normalised = urlunparse(
        (
            scheme,
            parsed.netloc.lower(),
            path,
            "",
            parsed.query,
            "",
        )
    )
    return normalised


def host_from_url(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


def urls_same_origin(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    return (
        (pa.scheme or "").lower() == (pb.scheme or "").lower()
        and (pa.hostname or "").lower() == (pb.hostname or "").lower()
        and (pa.port or _default_port(pa.scheme)) == (pb.port or _default_port(pb.scheme))
    )


def _default_port(scheme: str | None) -> int | None:
    if (scheme or "").lower() == "https":
        return 443
    if (scheme or "").lower() == "http":
        return 80
    return None
