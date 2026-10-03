from __future__ import annotations

import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse

from scanner.models.findings import FindingDraft


def analyse_tls(url: str, timeout: float = 10.0) -> list[FindingDraft]:
    """Safe TLS certificate observation — no protocol downgrade attacks."""
    findings: list[FindingDraft] = []
    parsed = urlparse(url)
    if parsed.scheme != "https":
        findings.append(
            FindingDraft(
                title="TLS analysis skipped (non-HTTPS URL)",
                severity="informational",
                category="tls",
                description="TLS certificate checks run only against https:// targets.",
                evidence=f"url={url}",
                impact="No TLS material was inspected for this target URL.",
                remediation="Serve the site over HTTPS to enable transport-security review.",
            )
        )
        return findings

    host = parsed.hostname
    port = parsed.port or 443
    if not host:
        findings.append(
            FindingDraft(
                title="TLS analysis failed — missing hostname",
                severity="high",
                category="tls",
                description="Could not determine hostname for TLS inspection.",
                evidence=f"url={url}",
                impact="Certificate validity could not be assessed.",
                remediation="Use a fully-qualified https URL.",
            )
        )
        return findings

    context = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                version = ssock.version()
    except ssl.SSLCertVerificationError as exc:
        findings.append(
            FindingDraft(
                title="TLS certificate validation failed",
                severity="high",
                category="tls",
                description="Python's default trust store rejected the certificate during a normal handshake.",
                evidence=f"host={host}; error={exc.__class__.__name__}",
                impact="Clients may see browser warnings or refuse the connection.",
                remediation="Install a valid certificate chain from a trusted CA for this hostname.",
            )
        )
        return findings
    except OSError as exc:
        findings.append(
            FindingDraft(
                title="TLS handshake could not be completed",
                severity="medium",
                category="tls",
                description="Sentinel could not complete a TLS handshake for certificate inspection.",
                evidence=f"host={host}; error={exc.__class__.__name__}",
                impact="Transport security posture could not be verified.",
                remediation="Confirm the HTTPS listener is reachable and not blocking the scanner host.",
            )
        )
        return findings

    if not cert:
        findings.append(
            FindingDraft(
                title="No peer certificate returned",
                severity="medium",
                category="tls",
                description="The TLS handshake succeeded but no peer certificate was available to inspect.",
                evidence=f"host={host}; tls_version={version}",
                impact="Certificate expiry and hostname binding could not be checked.",
                remediation="Verify the server presents a complete certificate chain.",
            )
        )
        return findings

    subject = dict(x[0] for x in cert.get("subject", []))
    issuer = dict(x[0] for x in cert.get("issuer", []))
    not_after_raw = cert.get("notAfter")
    san = cert.get("subjectAltName", ())

    findings.append(
        FindingDraft(
            title="TLS certificate observed",
            severity="informational",
            category="tls",
            description="A validated certificate was presented for the hostname.",
            evidence=(
                f"subject={subject.get('commonName')}; issuer={issuer.get('organizationName') or issuer.get('commonName')}; "
                f"tls_version={version}; not_after={not_after_raw}"
            ),
            impact="Positive observation: browser-trusted TLS appears configured.",
            remediation="Monitor expiry and prefer modern TLS versions.",
        )
    )

    if version and version in {"TLSv1", "TLSv1.1", "SSLv3", "SSLv2"}:
        findings.append(
            FindingDraft(
                title=f"Legacy TLS version negotiated: {version}",
                severity="high",
                category="tls",
                description="The connection negotiated a legacy TLS protocol version.",
                evidence=f"version={version}",
                impact="Older protocols have known weaknesses and are widely disabled by modern clients.",
                remediation="Disable TLS 1.0/1.1 and require TLS 1.2+.",
            )
        )

    if not_after_raw:
        try:
            expires = datetime.strptime(not_after_raw, "%b %d %H:%M:%S %Y %Z").replace(
                tzinfo=timezone.utc
            )
            days = (expires - datetime.now(timezone.utc)).days
            if days < 0:
                findings.append(
                    FindingDraft(
                        title="TLS certificate expired",
                        severity="critical",
                        category="tls",
                        description="The presented certificate is past its notAfter date.",
                        evidence=f"notAfter={not_after_raw}",
                        impact="Clients should reject the connection as untrusted.",
                        remediation="Renew and deploy a valid certificate immediately.",
                    )
                )
            elif days <= 14:
                findings.append(
                    FindingDraft(
                        title="TLS certificate expires soon",
                        severity="medium",
                        category="tls",
                        description="The certificate expires within 14 days.",
                        evidence=f"notAfter={not_after_raw}; days_remaining={days}",
                        impact="Imminent expiry can cause sudden browser trust failures.",
                        remediation="Renew the certificate and automate renewal where possible.",
                    )
                )
        except ValueError:
            findings.append(
                FindingDraft(
                    title="Could not parse certificate expiry",
                    severity="informational",
                    category="tls",
                    description="The certificate notAfter field could not be parsed reliably.",
                    evidence=f"notAfter={not_after_raw}",
                    impact="Expiry monitoring for this scan is limited.",
                    remediation="Inspect the certificate with openssl or similar tooling.",
                )
            )

    names = {v.lower() for t, v in san if t == "DNS"}
    cn = (subject.get("commonName") or "").lower()
    if cn:
        names.add(cn)
    if names and host.lower() not in names and not any(
        n.startswith("*.") and host.lower().endswith(n[1:]) for n in names
    ):
        findings.append(
            FindingDraft(
                title="Hostname not listed on certificate",
                severity="high",
                category="tls",
                description="The requested hostname does not appear in the certificate CN/SAN set.",
                evidence=f"host={host}; names={sorted(names)}",
                impact="Clients may treat the certificate as mismatched for this hostname.",
                remediation="Issue a certificate that includes this hostname in SAN.",
            )
        )

    return findings
