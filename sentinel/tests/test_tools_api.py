from unittest.mock import patch

from scanner.engine.http_client import HttpObservation


def _auth_target(client, auth_headers):
    return client.post(
        "/api/targets",
        headers=auth_headers,
        json={"name": "Lab", "url": "https://example.com"},
    ).json()


def test_tools_require_auth(client):
    assert client.post("/api/tools/headers", json={"target_id": "x"}).status_code == 401


def test_headers_tool(client, auth_headers):
    target = _auth_target(client, auth_headers)
    obs = HttpObservation(
        requested_url="https://example.com/",
        final_url="https://example.com/",
        status_code=200,
        headers={"content-security-policy": "default-src 'self'", "server": "demo"},
        cookies=[],
    )
    with patch("api.services.tools.fetch_observation", return_value=obs):
        res = client.post(
            "/api/tools/headers",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["status_code"] == 200
    names = {h["name"] for h in body["headers"]}
    assert "content-security-policy" in names
    assert any(m["name"] == "strict-transport-security" for m in body["missing_security_headers"])


def test_redirects_tool(client, auth_headers):
    target = _auth_target(client, auth_headers)
    obs = HttpObservation(
        requested_url="http://example.com/",
        final_url="https://example.com/",
        status_code=200,
        headers={},
        cookies=[],
        redirect_chain=[
            {
                "url": "http://example.com/",
                "status_code": 301,
                "location": "https://example.com/",
            }
        ],
    )
    with patch("api.services.tools.fetch_observation", return_value=obs):
        res = client.post(
            "/api/tools/redirects",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["hop_count"] == 1
    assert body["hops"][-1]["final"] is True


def test_tls_tool_rejects_unknown_host(client, auth_headers):
    target = _auth_target(client, auth_headers)
    res = client.post(
        "/api/tools/tls",
        headers=auth_headers,
        json={"target_id": target["id"], "url": "https://evil.example"},
    )
    assert res.status_code == 400


def test_disclosure_tool(client, auth_headers):
    target = _auth_target(client, auth_headers)

    class FakeResp:
        def __init__(self, status_code, text):
            self.status_code = status_code
            self.text = text
            self.content = text.encode()

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, url):
            if url.endswith("robots.txt"):
                return FakeResp(200, "User-agent: *\nDisallow: /admin\n")
            if "security.txt" in url:
                return FakeResp(200, "Contact: mailto:sec@example.com\n")
            return FakeResp(404, "")

    with patch("api.services.tools.httpx.Client", FakeClient):
        res = client.post(
            "/api/tools/disclosure",
            headers=auth_headers,
            json={"target_id": target["id"]},
        )
    assert res.status_code == 200
    files = {f["name"]: f for f in res.json()["files"]}
    assert files["robots.txt"]["status_code"] == 200
    assert any("Disallow" in n for n in files["robots.txt"]["notes"])
