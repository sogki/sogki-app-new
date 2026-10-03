"""Deterministic Sentinel Security Score.

This is an internal prioritisation metric — not CVSS and not a penetration test.
"""

from __future__ import annotations

from scanner.models.findings import FindingDraft

# Fixed deductions — same inputs always produce the same score.
DEDUCTIONS = {
    "critical": 25,
    "high": 15,
    "medium": 8,
    "low": 3,
    "informational": 0,
}

# Informational findings that represent positive controls can add small credit,
# capped so a noisy site cannot inflate the score unrealistically.
POSITIVE_TITLES = {
    "HTTPS endpoint reachable",
    "HTTP redirects to HTTPS",
    "TLS certificate observed",
    "content-security-policy present",
    "strict-transport-security present",
}


def calculate_score(findings: list[FindingDraft]) -> tuple[int, dict]:
    score = 100
    breakdown: dict[str, int] = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "informational": 0,
        "positive_credit": 0,
    }

    for finding in findings:
        breakdown[finding.severity] = breakdown.get(finding.severity, 0) + 1
        score -= DEDUCTIONS.get(finding.severity, 0)

    credit = 0
    for finding in findings:
        if finding.severity == "informational" and (
            finding.title in POSITIVE_TITLES or finding.title.endswith(" present")
        ):
            credit += 1
    credit = min(credit, 5)
    score += credit
    breakdown["positive_credit"] = credit

    score = max(0, min(100, score))
    return score, breakdown


def summarise_severities(findings: list[FindingDraft]) -> dict[str, int]:
    summary = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "informational": 0,
        "total": len(findings),
    }
    for f in findings:
        summary[f.severity] = summary.get(f.severity, 0) + 1
    return summary
