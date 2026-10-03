from scanner.engine.scoring import calculate_score, summarise_severities
from scanner.models.findings import FindingDraft


def test_score_deductions_deterministic():
    findings = [
        FindingDraft("a", "high", "http", "d"),
        FindingDraft("b", "medium", "http", "d"),
        FindingDraft("c", "informational", "http", "d"),
    ]
    score, breakdown = calculate_score(findings)
    assert score == 100 - 15 - 8
    assert breakdown["high"] == 1
    assert breakdown["medium"] == 1
    assert calculate_score(findings)[0] == score


def test_summarise_severities():
    findings = [
        FindingDraft("a", "critical", "tls", "d"),
        FindingDraft("b", "low", "cookies", "d"),
    ]
    summary = summarise_severities(findings)
    assert summary["critical"] == 1
    assert summary["low"] == 1
    assert summary["total"] == 2
