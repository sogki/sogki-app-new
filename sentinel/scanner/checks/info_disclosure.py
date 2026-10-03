from __future__ import annotations

import re
from urllib.parse import urljoin

import httpx

from scanner.engine.http_client import HttpObservation
from scanner.models.findings import FindingDraft

FRAMEWORK_HINTS = [
    (re.compile(r"x-powered-by", re.I), "X-Powered-By"),
    (re.compile(r"x-aspnet-version", re.I), "X-AspNet-Version"),
    (re.compile(r"x-drupal-cache", re.I), "Drupal"),
    (re.compile(r"x-generator", re.I), "X-Generator"),
]


def analyse_info_disclosure(
    obs: HttpObservation,
    *,
    timeout: float = 10.0,
    user_agent: str = "SentinelPrivateScanner/1.0 (+personal-lab; non-destructive)",
) -> list[FindingDraft]:
    """Passive metadata checks — does not attempt auth bypass or sensitive file brute force."""
    findings: list[FindingDraft] = []

    for pattern, label in FRAMEWORK_HINTS:
        for key, value in obs.headers.items():
            if pattern.search(key):
                findings.append(
                    FindingDraft(
                        title=f"Technology header exposed: {label}",
                        severity="low",
                        category="information_disclosure",
                        description="A response header discloses framework or platform information.",
                        evidence=f"{key}: {value[:200]}",
                        impact="Version or platform hints help attackers prioritise known issues.",
                        remediation="Remove or genericise unnecessary technology headers in production.",
                    )
                )

    snippet = obs.body_snippet or ""
    if re.search(r"(traceback \(most recent call last\)|exception in|stack trace)", snippet, re.I):
        findings.append(
            FindingDraft(
                title="Possible debug/error content in response body",
                severity="medium",
                category="information_disclosure",
                description="The response body snippet resembles debug or stack-trace output.",
                evidence=snippet[:400],
                impact="Error detail can leak paths, libraries, or internal logic.",
                remediation="Return generic error pages and disable debug mode in production.",
            )
        )

    base = obs.final_url if obs.final_url.endswith("/") else obs.final_url.rsplit("/", 1)[0] + "/"
    for path, title in (("robots.txt", "robots.txt"), ("sitemap.xml", "sitemap.xml")):
        url = urljoin(base, path)
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": user_agent}) as client:
                res = client.get(url)
            if res.status_code == 200 and res.text.strip():
                findings.append(
                    FindingDraft(
                        title=f"Public {title} reachable",
                        severity="informational",
                        category="information_disclosure",
                        description=f"A publicly reachable {title} was found. This is often intentional.",
                        evidence=f"url={url}; status={res.status_code}; bytes={len(res.content)}",
                        impact="May disclose path names or content inventory to anyone on the internet.",
                        remediation="Review disclosed paths; keep sensitive areas out of public sitemaps.",
                    )
                )
            elif res.status_code == 200:
                findings.append(
                    FindingDraft(
                        title=f"Empty {title} returned",
                        severity="informational",
                        category="information_disclosure",
                        description=f"{title} returned an empty 200 response.",
                        evidence=f"url={url}; status=200",
                        impact="Low — empty file discloses little.",
                        remediation="Ensure the file is intentional.",
                    )
                )
        except httpx.HTTPError:
            findings.append(
                FindingDraft(
                    title=f"Could not fetch {title}",
                    severity="informational",
                    category="information_disclosure",
                    description=f"Passive fetch of {title} failed; no conclusion drawn.",
                    evidence=f"url={url}",
                    impact="Metadata check incomplete for this path.",
                    remediation="No action required unless the file should exist.",
                )
            )

    return findings
