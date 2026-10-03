from scanner.checks.http_basic import analyse_http
from scanner.checks.tls import analyse_tls
from scanner.engine.http_client import HttpObservation


def test_http_to_https_redirect_finding():
    obs = HttpObservation(
        requested_url="http://example.com",
        final_url="https://example.com",
        status_code=200,
        headers={},
        cookies=[],
        redirect_chain=[
            {"url": "http://example.com", "status_code": 301, "location": "https://example.com"}
        ],
    )
    findings = analyse_http(obs)
    assert any("redirects to HTTPS" in f.title for f in findings)


def test_tls_skips_http_urls():
    findings = analyse_tls("http://example.com")
    assert findings[0].title.startswith("TLS analysis skipped")
