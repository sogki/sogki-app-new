"""Safe HTTP client for passive observation."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx


@dataclass
class HttpObservation:
    requested_url: str
    final_url: str
    status_code: int
    headers: dict[str, str]
    cookies: list[dict]
    redirect_chain: list[dict] = field(default_factory=list)
    body_snippet: str = ""
    error: str | None = None


def fetch_observation(
    url: str,
    *,
    timeout: float = 10.0,
    max_redirects: int = 5,
    user_agent: str = "SentinelPrivateScanner/1.0 (+personal-lab; non-destructive)",
) -> HttpObservation:
    headers = {"User-Agent": user_agent, "Accept": "*/*"}
    redirect_chain: list[dict] = []

    try:
        with httpx.Client(
            follow_redirects=False,
            timeout=timeout,
            headers=headers,
            verify=True,
        ) as client:
            current = url
            response: httpx.Response | None = None
            for _ in range(max_redirects + 1):
                response = client.get(current)
                if response.is_redirect:
                    location = response.headers.get("location", "")
                    redirect_chain.append(
                        {
                            "url": str(response.url),
                            "status_code": response.status_code,
                            "location": location,
                        }
                    )
                    if not location:
                        break
                    current = str(response.url.join(location))
                    continue
                break

            assert response is not None
            cookie_list = []
            for cookie in response.cookies.jar:
                cookie_list.append(
                    {
                        "name": cookie.name,
                        "value": "[redacted]",
                        "secure": bool(cookie.secure),
                        "httponly": "httponly" in {k.lower() for k in (cookie._rest or {})}
                        or str(getattr(cookie, "rest", {})).lower().find("httponly") >= 0,
                        "samesite": (cookie._rest or {}).get("samesite")
                        or (cookie._rest or {}).get("SameSite"),
                        "domain": cookie.domain,
                        "path": cookie.path,
                        "expires": cookie.expires,
                    }
                )

            # Prefer Set-Cookie header parsing for flags httpx may miss
            set_cookies = response.headers.get_list("set-cookie") if hasattr(response.headers, "get_list") else []
            if not set_cookies:
                raw = response.headers.get("set-cookie")
                set_cookies = [raw] if raw else []

            parsed_from_headers = [_parse_set_cookie(c) for c in set_cookies if c]
            cookies = parsed_from_headers or cookie_list

            body = ""
            try:
                body = response.text[:2000]
            except Exception:
                body = ""

            return HttpObservation(
                requested_url=url,
                final_url=str(response.url),
                status_code=response.status_code,
                headers={k.lower(): v for k, v in response.headers.items()},
                cookies=cookies,
                redirect_chain=redirect_chain,
                body_snippet=body,
            )
    except httpx.HTTPError as exc:
        return HttpObservation(
            requested_url=url,
            final_url=url,
            status_code=0,
            headers={},
            cookies=[],
            redirect_chain=redirect_chain,
            error=str(exc.__class__.__name__),
        )


def _parse_set_cookie(header: str) -> dict:
    parts = [p.strip() for p in header.split(";")]
    name_value = parts[0] if parts else "="
    name, _, _value = name_value.partition("=")
    attrs = {p.split("=", 1)[0].lower(): (p.split("=", 1)[1] if "=" in p else True) for p in parts[1:]}
    return {
        "name": name,
        "value": "[redacted]",
        "secure": "secure" in attrs,
        "httponly": "httponly" in attrs,
        "samesite": attrs.get("samesite"),
        "domain": attrs.get("domain"),
        "path": attrs.get("path", "/"),
        "expires": attrs.get("expires") or attrs.get("max-age"),
    }
