from __future__ import annotations

from scanner.engine.http_client import HttpObservation
from scanner.models.findings import FindingDraft


def analyse_cors(obs: HttpObservation) -> list[FindingDraft]:
    """Analyse observable CORS headers on a normal GET.

    Limitation: this does not send crafted Origin preflights. It only explains
    ACAO/ACAC values present on the observed response.
    """
    findings: list[FindingDraft] = []
    acao = obs.headers.get("access-control-allow-origin")
    acac = obs.headers.get("access-control-allow-credentials")

    if not acao:
        findings.append(
            FindingDraft(
                title="No Access-Control-Allow-Origin on observed response",
                severity="informational",
                category="cors",
                description=(
                    "This GET response did not advertise CORS. That is often correct for "
                    "same-origin HTML documents. Sentinel did not send a crafted Origin probe."
                ),
                evidence=f"final_url={obs.final_url}",
                impact="No CORS configuration was observable on this response.",
                remediation="If you expose APIs cross-origin, define an explicit allowlist of trusted origins.",
            )
        )
        return findings

    evidence = f"Access-Control-Allow-Origin: {acao}"
    if acac:
        evidence += f"; Access-Control-Allow-Credentials: {acac}"

    if acao.strip() == "*":
        severity = "medium"
        if acac and acac.lower() == "true":
            severity = "high"
            findings.append(
                FindingDraft(
                    title="CORS allows any origin with credentials",
                    severity=severity,
                    category="cors",
                    description=(
                        "The response allows any origin and also allows credentials. "
                        "Browsers should reject this combination, but the configuration is unsafe to keep."
                    ),
                    evidence=evidence,
                    impact="Intended credentialed cross-origin access cannot be safely expressed with ACAO=*.",
                    remediation="Reflect only trusted origins and never combine ACAO=* with credentials.",
                )
            )
        else:
            findings.append(
                FindingDraft(
                    title="CORS Access-Control-Allow-Origin is wildcard",
                    severity=severity,
                    category="cors",
                    description=(
                        "Any website can read this response from a browser if the endpoint is "
                        "called cross-origin. That may be acceptable for public non-sensitive resources."
                    ),
                    evidence=evidence,
                    impact="Cross-origin scripts can read the response body for this resource.",
                    remediation="If the resource is sensitive or user-specific, replace * with an explicit origin allowlist.",
                )
            )
    else:
        findings.append(
            FindingDraft(
                title="CORS Access-Control-Allow-Origin is explicit",
                severity="informational",
                category="cors",
                description="An explicit ACAO value was observed rather than a wildcard.",
                evidence=evidence,
                impact="Cross-origin access appears constrained to a named origin on this response.",
                remediation="Ensure the allowlist cannot be influenced by untrusted Origin reflection.",
            )
        )

    return findings
