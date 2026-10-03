from unittest.mock import patch

from scanner.engine.runner import ScanOutcome
from scanner.models.findings import FindingDraft


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "sentinel"


def test_targets_require_auth(client):
    res = client.get("/api/targets")
    assert res.status_code == 401


def test_create_list_delete_target(client, auth_headers):
    res = client.post(
        "/api/targets",
        headers=auth_headers,
        json={"name": "Lab", "url": "https://example.com"},
    )
    assert res.status_code == 200
    target = res.json()
    assert target["url"].startswith("https://example.com")

    listed = client.get("/api/targets", headers=auth_headers).json()
    assert len(listed) == 1

    deleted = client.delete(f"/api/targets/{target['id']}", headers=auth_headers)
    assert deleted.status_code == 200
    assert client.get("/api/targets", headers=auth_headers).json() == []


def test_scan_flow_with_mocked_engine(client, auth_headers):
    target = client.post(
        "/api/targets",
        headers=auth_headers,
        json={"name": "Lab", "url": "https://example.com"},
    ).json()

    outcome = ScanOutcome(
        url="https://example.com/",
        findings=[
            FindingDraft(
                title="Missing Content-Security-Policy",
                severity="medium",
                category="security_headers",
                description="missing",
                evidence="none",
                impact="xss impact",
                remediation="add csp",
            )
        ],
        score=92,
        score_breakdown={"medium": 1},
        findings_summary={"medium": 1, "total": 1, "critical": 0, "high": 0, "low": 0, "informational": 0},
    )

    with patch("api.services.scans.run_passive_scan", return_value=outcome):
        scan = client.post(
            "/api/scans",
            headers=auth_headers,
            json={"target_id": target["id"]},
        ).json()

    assert scan["status"] == "completed"
    assert scan["score"] == 92
    findings = client.get(f"/api/scans/{scan['id']}/findings", headers=auth_headers).json()
    assert len(findings) == 1
    report = client.get(f"/api/reports/{scan['id']}", headers=auth_headers).json()
    assert report["score"] == 92
    assert "passive" in report["limitations"].lower()

    dash = client.get("/api/dashboard", headers=auth_headers).json()
    assert dash["total_scans"] == 1
    assert dash["system_status"] == "operational"
