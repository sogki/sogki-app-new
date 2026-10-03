from __future__ import annotations

from urllib.parse import urlparse

from scanner.engine.http_client import HttpObservation
from scanner.models.findings import FindingDraft


def analyse_http(obs: HttpObservation) -> list[FindingDraft]:
    findings: list[FindingDraft] = []
    requested = urlparse(obs.requested_url)
    final = urlparse(obs.final_url)

    if obs.error:
        findings.append(
            FindingDraft(
                title="HTTP request failed",
                severity="high",
                category="http",
                description="Sentinel could not complete a passive HTTP request to the target.",
                evidence=f"error={obs.error}",
                impact="The target may be unreachable, blocking assessment of configuration.",
                remediation="Confirm the host is online and reachable from the scanner host.",
            )
        )
        return findings

    if requested.scheme == "http":
        https_redirect = any(
            (r.get("status_code") in {301, 302, 307, 308})
            and str(r.get("location", "")).lower().startswith("https://")
            for r in obs.redirect_chain
        ) or final.scheme == "https"
        if not https_redirect:
            findings.append(
                FindingDraft(
                    title="No HTTP to HTTPS redirect observed",
                    severity="medium",
                    category="http",
                    description="The target was requested over HTTP and did not redirect to HTTPS.",
                    evidence=f"requested={obs.requested_url}; final={obs.final_url}; status={obs.status_code}",
                    impact="Users may continue on an unencrypted channel if they type http://.",
                    remediation="Redirect all HTTP requests to HTTPS with a permanent redirect.",
                    references=["https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security"],
                )
            )
        else:
            findings.append(
                FindingDraft(
                    title="HTTP redirects to HTTPS",
                    severity="informational",
                    category="http",
                    description="An HTTP request was redirected to HTTPS.",
                    evidence=f"redirect_chain={obs.redirect_chain}",
                    impact="Positive control: clients are steered onto TLS.",
                    remediation="Keep the redirect and prefer HSTS once HTTPS is stable.",
                )
            )

    if requested.scheme == "https" or final.scheme == "https":
        findings.append(
            FindingDraft(
                title="HTTPS endpoint reachable",
                severity="informational",
                category="http",
                description="The target responded over HTTPS during passive assessment.",
                evidence=f"final_url={obs.final_url}; status={obs.status_code}",
                impact="Transport encryption is available for this host.",
                remediation="Maintain valid certificates and modern TLS configuration.",
            )
        )

    if obs.status_code >= 500:
        findings.append(
            FindingDraft(
                title="Server error status returned",
                severity="low",
                category="http",
                description="The target returned a 5xx status during a normal GET.",
                evidence=f"status_code={obs.status_code}",
                impact="May indicate instability or expose error-handling behaviour.",
                remediation="Investigate server logs and ensure generic error pages in production.",
            )
        )

    if len(obs.redirect_chain) >= 4:
        findings.append(
            FindingDraft(
                title="Long redirect chain",
                severity="low",
                category="http",
                description="Multiple redirects were observed before a final response.",
                evidence=f"hops={len(obs.redirect_chain)}; chain={obs.redirect_chain}",
                impact="Long chains can complicate HSTS/cookie scope and frustrate clients.",
                remediation="Collapse unnecessary redirects to a single canonical hop where possible.",
            )
        )

    server = obs.headers.get("server")
    if server:
        findings.append(
            FindingDraft(
                title="Server header present",
                severity="informational",
                category="http",
                description="The response includes a Server header that may disclose software details.",
                evidence=f"Server: {server}",
                impact="Attackers can use version hints to prioritise known issues.",
                remediation="Minimise or genericise the Server header where operationally acceptable.",
            )
        )

    return findings
