from __future__ import annotations

from scanner.engine.http_client import HttpObservation
from scanner.models.findings import FindingDraft, Severity

HEADER_CHECKS: list[tuple[str, Severity, str, str, str]] = [
    (
        "content-security-policy",
        "medium",
        "Missing Content-Security-Policy",
        "CSP reduces the impact of XSS by controlling which resources the browser may load.",
        "Define a Content-Security-Policy appropriate for the application, starting in report-only if needed.",
    ),
    (
        "strict-transport-security",
        "medium",
        "Missing Strict-Transport-Security",
        "Without HSTS, browsers may still attempt plaintext HTTP on first visit or after cache loss.",
        "Serve Strict-Transport-Security on HTTPS responses with an appropriate max-age.",
    ),
    (
        "x-content-type-options",
        "low",
        "Missing X-Content-Type-Options",
        "Browsers may MIME-sniff responses, which can assist certain content-confusion attacks.",
        "Set X-Content-Type-Options: nosniff on all responses.",
    ),
    (
        "x-frame-options",
        "low",
        "Missing X-Frame-Options",
        "Framing controls help mitigate clickjacking when CSP frame-ancestors is not present.",
        "Set X-Frame-Options: DENY or SAMEORIGIN, or use CSP frame-ancestors.",
    ),
    (
        "referrer-policy",
        "low",
        "Missing Referrer-Policy",
        "Default referrer behaviour may leak path or query data to third parties.",
        "Set an explicit Referrer-Policy such as strict-origin-when-cross-origin.",
    ),
    (
        "permissions-policy",
        "low",
        "Missing Permissions-Policy",
        "Browser features (camera, geolocation, etc.) may remain available to the page by default.",
        "Declare a Permissions-Policy that disables unused powerful features.",
    ),
    (
        "cross-origin-opener-policy",
        "informational",
        "Missing Cross-Origin-Opener-Policy",
        "COOP helps isolate browsing contexts and reduce cross-origin window attacks.",
        "Consider Cross-Origin-Opener-Policy: same-origin where compatible.",
    ),
    (
        "cross-origin-resource-policy",
        "informational",
        "Missing Cross-Origin-Resource-Policy",
        "CORP controls which origins can load the resource, reducing certain cross-origin reads.",
        "Consider Cross-Origin-Resource-Policy: same-origin or same-site where compatible.",
    ),
]


def analyse_security_headers(obs: HttpObservation) -> list[FindingDraft]:
    findings: list[FindingDraft] = []
    headers = obs.headers

    for header, severity, title, impact, remediation in HEADER_CHECKS:
        if header not in headers:
            # Avoid HSTS findings on pure HTTP final responses
            if header == "strict-transport-security" and not obs.final_url.lower().startswith(
                "https://"
            ):
                continue
            findings.append(
                FindingDraft(
                    title=title,
                    severity=severity,
                    category="security_headers",
                    description=f"The response did not include the {header} header.",
                    evidence=f"Checked headers on {obs.final_url}; {header} absent.",
                    impact=impact,
                    remediation=remediation,
                    references=["https://owasp.org/www-project-secure-headers/"],
                )
            )
        else:
            findings.append(
                FindingDraft(
                    title=f"{header} present",
                    severity="informational",
                    category="security_headers",
                    description=f"The response includes {header}.",
                    evidence=f"{header}: {headers[header][:300]}",
                    impact="Positive observation of a security-relevant header.",
                    remediation="Review the value periodically as the application evolves.",
                )
            )

    csp = headers.get("content-security-policy", "")
    if csp and ("unsafe-inline" in csp or "unsafe-eval" in csp):
        findings.append(
            FindingDraft(
                title="CSP allows unsafe-inline or unsafe-eval",
                severity="medium",
                category="security_headers",
                description="The Content-Security-Policy contains directives that weaken XSS protections.",
                evidence=csp[:500],
                impact="Inline script or eval-style execution may still be possible under this policy.",
                remediation="Prefer nonces/hashes and remove unsafe-inline/unsafe-eval where feasible.",
            )
        )

    return findings
