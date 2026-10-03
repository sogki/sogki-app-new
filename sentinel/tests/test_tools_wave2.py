from unittest.mock import patch

from scanner.engine.http_client import HttpObservation


def _target(client, auth_headers):
    return client.post(
        "/api/targets",
        headers=auth_headers,
        json={"name": "Lab", "url": "https://example.com"},
    ).json()


def test_dns_api(client, auth_headers):
    target = _target(client, auth_headers)
    mocked = {
        "hostname": "example.com",
        "records": [
            {"type": "A", "name": "example.com", "value": "1.2.3.4"},
            {"type": "A", "name": "example.com", "value": "1.2.3.5"},
            {"type": "CNAME", "name": "www.example.com", "value": "cdn.cloudflare.com"},
        ],
        "cname_chain": ["example.com", "cdn.cloudflare.com"],
        "addresses": ["1.2.3.4", "1.2.3.5"],
        "ptr": [],
        "infrastructure_hints": ["Cloudflare (CDN / reverse proxy)"],
        "limitations": "passive",
        "error": None,
    }
    with patch("api.services.tools.lookup_dns", return_value=mocked):
        res = client.post(
            "/api/tools/dns",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    body = res.json()
    assert len(body["addresses"]) == 2
    assert body["infrastructure_hints"]


def test_csp_api(client, auth_headers):
    target = _target(client, auth_headers)
    obs = HttpObservation(
        requested_url="https://example.com/",
        final_url="https://example.com/",
        status_code=200,
        headers={"content-security-policy": "default-src *; script-src 'unsafe-inline'"},
        cookies=[],
    )
    with patch("api.services.tools.fetch_observation", return_value=obs):
        res = client.post(
            "/api/tools/csp",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    issues = res.json()["issues"]
    assert any("unsafe-inline" in i["title"] for i in issues)


def test_methods_api(client, auth_headers):
    target = _target(client, auth_headers)

    class FakeResp:
        def __init__(self, status_code, allow=None):
            self.status_code = status_code
            self.headers = {"allow": allow} if allow else {}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def request(self, method, url):
            return FakeResp(200 if method == "GET" else 204, "GET, HEAD, OPTIONS")

    with patch("api.services.tools.httpx.Client", FakeClient):
        res = client.post(
            "/api/tools/methods",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    assert len(res.json()["results"]) == 3


def test_diff_api(client, auth_headers):
    target = _target(client, auth_headers)
    from scanner.engine.runner import ScanOutcome
    from scanner.models.findings import FindingDraft

    outcome_a = ScanOutcome(
        url="https://example.com/",
        findings=[
            FindingDraft("Missing CSP", "medium", "security_headers", "d"),
            FindingDraft("Server header present", "informational", "http", "d"),
        ],
        score=90,
        score_breakdown={},
        findings_summary={"medium": 1, "informational": 1, "total": 2, "critical": 0, "high": 0, "low": 0},
    )
    outcome_b = ScanOutcome(
        url="https://example.com/",
        findings=[FindingDraft("Server header present", "informational", "http", "d")],
        score=98,
        score_breakdown={},
        findings_summary={"informational": 1, "total": 1, "critical": 0, "high": 0, "medium": 0, "low": 0},
    )
    with patch("api.services.scans.run_passive_scan", side_effect=[outcome_a, outcome_b]):
        a = client.post("/api/scans", headers=auth_headers, json={"target_id": target["id"]}).json()
        b = client.post("/api/scans", headers=auth_headers, json={"target_id": target["id"]}).json()
    res = client.post(
        "/api/tools/diff",
        headers=auth_headers,
        json={"scan_a": a["id"], "scan_b": b["id"]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["score_delta"] == 8
    assert any(f["title"] == "Missing CSP" for f in body["only_in_a"])
