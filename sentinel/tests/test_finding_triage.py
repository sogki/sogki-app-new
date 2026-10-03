from api.models import Finding, Scan


def test_patch_finding_triage(client, auth_headers, db_session):
    target = client.post(
        "/api/targets",
        headers=auth_headers,
        json={"name": "Lab", "url": "https://example.com"},
    ).json()

    scan = Scan(
        target_id=target["id"],
        target_url="https://example.com/",
        status="completed",
        score=80.0,
    )
    db_session.add(scan)
    db_session.flush()
    finding = Finding(
        scan_id=scan.id,
        title="Missing HSTS",
        severity="high",
        category="headers",
        description="No HSTS",
        evidence="",
        impact="MITM risk",
        remediation="Add HSTS",
        references=[],
        triage_status="open",
        triage_notes="",
    )
    db_session.add(finding)
    db_session.commit()
    finding_id = finding.id

    res = client.patch(
        f"/api/findings/{finding_id}",
        headers=auth_headers,
        json={"triage_status": "accepted", "triage_notes": "Accept for now"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["triage_status"] == "accepted"
    assert body["triage_notes"] == "Accept for now"

    dash = client.get("/api/dashboard", headers=auth_headers)
    assert dash.status_code == 200
    data = dash.json()
    assert "target_health" in data
    assert "open_findings" in data
    assert data["open_findings"]["high"] == 0
