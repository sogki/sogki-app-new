from __future__ import annotations

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from api.models import Finding, Scan, Target
from api.schemas.dto import FindingOut, FindingsSummary, ReportOut
from api.services.scans import findings_summary_from_rows

LIMITATIONS = (
    "This Sentinel report is a private, passive configuration assessment. "
    "It is not a penetration test, red-team engagement, or CVSS-based rating. "
    "Checks observe HTTP responses, security headers, cookies, TLS certificate metadata, "
    "public robots/sitemap files, and CORS headers present on normal responses. "
    "Sentinel does not attempt authentication bypass, credential attacks, exploitation, "
    "or denial of service. Findings reflect what was observable from the scanner host at scan time."
)


def build_report(db: Session, scan_id: str) -> ReportOut:
    scan = db.get(Scan, scan_id)
    if not scan:
        raise ValueError("Scan not found")
    if scan.status != "completed":
        raise ValueError("Report available only for completed scans")

    target = db.get(Target, scan.target_id)
    findings = list(scan.findings)
    summary = findings_summary_from_rows(findings)
    recommendations = _recommendations(findings, summary)
    executive = _executive_summary(target, scan, summary)

    return ReportOut(
        id=scan.id,
        scan_id=scan.id,
        target_name=target.name if target else scan.target_url,
        target_url=scan.target_url,
        scan_date=scan.finished_at or scan.created_at,
        score=scan.score,
        executive_summary=executive,
        findings=[FindingOut.model_validate(f) for f in findings],
        findings_summary=summary,
        limitations=LIMITATIONS,
        recommendations=recommendations,
    )


def render_report_pdf(report: ReportOut) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("SENTINEL — Private Security Assessment Report", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"<b>Target:</b> {report.target_name} ({report.target_url})", styles["Normal"]),
        Paragraph(f"<b>Scan date:</b> {report.scan_date}", styles["Normal"]),
        Paragraph(
            f"<b>Sentinel Security Score:</b> {report.score if report.score is not None else '—'}/100",
            styles["Normal"],
        ),
        Spacer(1, 12),
        Paragraph("Executive summary", styles["Heading2"]),
        Paragraph(report.executive_summary, styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Recommendations", styles["Heading2"]),
    ]
    for rec in report.recommendations:
        story.append(Paragraph(f"• {rec}", styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Findings", styles["Heading2"]))
    for finding in report.findings:
        story.append(Paragraph(f"<b>[{finding.severity}] {finding.title}</b>", styles["Normal"]))
        story.append(Paragraph(finding.description, styles["Normal"]))
        story.append(Paragraph(f"<i>Evidence:</i> {finding.evidence}", styles["Normal"]))
        story.append(Paragraph(f"<i>Remediation:</i> {finding.remediation}", styles["Normal"]))
        story.append(Spacer(1, 8))
    story.append(Paragraph("Scan limitations", styles["Heading2"]))
    story.append(Paragraph(report.limitations, styles["Normal"]))
    doc.build(story)
    return buffer.getvalue()


def _executive_summary(target: Target | None, scan: Scan, summary: FindingsSummary) -> str:
    name = target.name if target else scan.target_url
    score = scan.score if scan.score is not None else "n/a"
    return (
        f"Sentinel completed a passive assessment of {name}. "
        f"The Sentinel Security Score is {score}/100. "
        f"Findings: {summary.critical} critical, {summary.high} high, "
        f"{summary.medium} medium, {summary.low} low, {summary.informational} informational. "
        "This score is an internal prioritisation metric and does not replace professional testing."
    )


def _recommendations(findings: list[Finding], summary: FindingsSummary) -> list[str]:
    recs: list[str] = []
    for finding in findings:
        if finding.severity in {"critical", "high", "medium"} and finding.remediation:
            if finding.remediation not in recs:
                recs.append(finding.remediation)
        if len(recs) >= 8:
            break
    if not recs:
        recs.append("Maintain HTTPS, security headers, and cookie hardening as the application evolves.")
    if summary.total == 0:
        recs.append("Re-run Sentinel after configuration changes to track regressions.")
    return recs
