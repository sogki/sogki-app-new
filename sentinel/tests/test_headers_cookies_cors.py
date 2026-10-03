from scanner.checks.cookies import analyse_cookies
from scanner.checks.cors import analyse_cors
from scanner.checks.headers import analyse_security_headers
from scanner.engine.http_client import HttpObservation


def _obs(**kwargs):
    base = dict(
        requested_url="https://example.com",
        final_url="https://example.com",
        status_code=200,
        headers={},
        cookies=[],
        redirect_chain=[],
    )
    base.update(kwargs)
    return HttpObservation(**base)


def test_missing_csp_finding():
    findings = analyse_security_headers(_obs(headers={"x-content-type-options": "nosniff"}))
    titles = {f.title for f in findings}
    assert "Missing Content-Security-Policy" in titles
    assert any(f.title == "x-content-type-options present" for f in findings)


def test_insecure_cookie_flags():
    findings = analyse_cookies(
        _obs(
            cookies=[
                {
                    "name": "session",
                    "secure": False,
                    "httponly": False,
                    "samesite": None,
                    "domain": "example.com",
                    "path": "/",
                }
            ]
        )
    )
    titles = " ".join(f.title for f in findings)
    assert "Secure" in titles
    assert "HttpOnly" in titles
    assert "SameSite" in titles


def test_cors_wildcard_explained():
    findings = analyse_cors(_obs(headers={"access-control-allow-origin": "*"}))
    assert any("wildcard" in f.title.lower() for f in findings)
    assert any("may be acceptable" in f.description.lower() or "cross-origin" in f.description.lower() for f in findings)
