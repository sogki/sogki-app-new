from __future__ import annotations

from scanner.engine.http_client import HttpObservation
from scanner.models.findings import FindingDraft


def analyse_cookies(obs: HttpObservation) -> list[FindingDraft]:
    findings: list[FindingDraft] = []
    if not obs.cookies:
        findings.append(
            FindingDraft(
                title="No Set-Cookie headers observed",
                severity="informational",
                category="cookies",
                description="The passive response did not set cookies.",
                evidence="No Set-Cookie header in the observed response.",
                impact="No cookie configuration to review on this response.",
                remediation="When cookies are introduced, set Secure, HttpOnly, and SameSite appropriately.",
            )
        )
        return findings

    https = obs.final_url.lower().startswith("https://")

    for cookie in obs.cookies:
        name = cookie.get("name") or "unknown"
        evidence = (
            f"name={name}; secure={cookie.get('secure')}; httponly={cookie.get('httponly')}; "
            f"samesite={cookie.get('samesite')}; domain={cookie.get('domain')}; path={cookie.get('path')}"
        )

        if https and not cookie.get("secure"):
            findings.append(
                FindingDraft(
                    title=f"Cookie without Secure flag: {name}",
                    severity="medium",
                    category="cookies",
                    description="A cookie was set on an HTTPS response without the Secure attribute.",
                    evidence=evidence,
                    impact="The cookie could be sent over plaintext HTTP if the browser later uses http://.",
                    remediation="Add the Secure attribute to cookies used on HTTPS sites.",
                )
            )

        if not cookie.get("httponly"):
            findings.append(
                FindingDraft(
                    title=f"Cookie without HttpOnly flag: {name}",
                    severity="low",
                    category="cookies",
                    description="A cookie was set without HttpOnly, so script can read it if XSS exists.",
                    evidence=evidence,
                    impact="Session tokens in script-accessible cookies increase XSS impact.",
                    remediation="Set HttpOnly on session and auth cookies unless JavaScript must read them.",
                )
            )

        samesite = str(cookie.get("samesite") or "").lower()
        if not samesite:
            findings.append(
                FindingDraft(
                    title=f"Cookie without SameSite attribute: {name}",
                    severity="low",
                    category="cookies",
                    description="No SameSite attribute was observed for this cookie.",
                    evidence=evidence,
                    impact="Cross-site request behaviour may be less restrictive than intended.",
                    remediation="Set SameSite=Lax or Strict unless a documented cross-site need exists.",
                )
            )
        elif samesite == "none" and not cookie.get("secure"):
            findings.append(
                FindingDraft(
                    title=f"SameSite=None cookie missing Secure: {name}",
                    severity="high",
                    category="cookies",
                    description="SameSite=None cookies must also be marked Secure.",
                    evidence=evidence,
                    impact="Browsers may reject the cookie or expose inconsistent cross-site behaviour.",
                    remediation="Use SameSite=None; Secure together, or choose Lax/Strict instead.",
                )
            )

    return findings
