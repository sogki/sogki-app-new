from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

from scanner.checks import (
    analyse_cookies,
    analyse_cors,
    analyse_http,
    analyse_info_disclosure,
    analyse_security_headers,
    analyse_tls,
)
from scanner.engine.http_client import fetch_observation
from scanner.engine.scoring import calculate_score, summarise_severities
from scanner.engine.url import validate_and_normalise_url
from scanner.models.findings import FindingDraft


@dataclass
class ScanOutcome:
    url: str
    findings: list[FindingDraft]
    score: int
    score_breakdown: dict
    findings_summary: dict
    duration_hint_ms: int = 0


def run_passive_scan(
    url: str,
    *,
    timeout: float = 10.0,
    max_redirects: int = 5,
    user_agent: str = "SentinelPrivateScanner/1.0 (+personal-lab; non-destructive)",
) -> ScanOutcome:
    normalised = validate_and_normalise_url(url)

    # Prefer observing HTTPS when the saved target is https; also probe http→https if http.
    observations_urls = [normalised]
    parsed = urlparse(normalised)
    if parsed.scheme == "https":
        http_variant = normalised.replace("https://", "http://", 1)
        observations_urls.append(http_variant)

    all_findings: list[FindingDraft] = []
    primary = fetch_observation(
        normalised,
        timeout=timeout,
        max_redirects=max_redirects,
        user_agent=user_agent,
    )
    all_findings.extend(analyse_http(primary))
    all_findings.extend(analyse_security_headers(primary))
    all_findings.extend(analyse_cookies(primary))
    all_findings.extend(analyse_cors(primary))
    all_findings.extend(
        analyse_info_disclosure(primary, timeout=timeout, user_agent=user_agent)
    )
    all_findings.extend(analyse_tls(normalised, timeout=timeout))

    # Extra HTTP redirect observation when primary was HTTPS
    if len(observations_urls) > 1:
        http_obs = fetch_observation(
            observations_urls[1],
            timeout=timeout,
            max_redirects=max_redirects,
            user_agent=user_agent,
        )
        # Only keep redirect-focused findings to avoid double-counting header issues
        for finding in analyse_http(http_obs):
            if "redirect" in finding.title.lower() or "HTTP" in finding.title:
                all_findings.append(finding)

    score, breakdown = calculate_score(all_findings)
    summary = summarise_severities(all_findings)
    return ScanOutcome(
        url=normalised,
        findings=all_findings,
        score=score,
        score_breakdown=breakdown,
        findings_summary=summary,
    )
