from __future__ import annotations

import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.config import get_settings
from api.core.logging import get_logger
from api.models import Finding, Scan, ScanResult, Target
from api.schemas.dto import FindingsSummary
from scanner.engine.runner import run_passive_scan
from scanner.engine.url import UrlValidationError, host_from_url, urls_same_origin, validate_and_normalise_url

logger = get_logger("scans")


def findings_summary_from_rows(
    rows: list[Finding], *, open_only: bool = False
) -> FindingsSummary:
    summary = FindingsSummary()
    for row in rows:
        status = getattr(row, "triage_status", None) or "open"
        if open_only and status != "open":
            continue
        if row.severity == "critical":
            summary.critical += 1
        elif row.severity == "high":
            summary.high += 1
        elif row.severity == "medium":
            summary.medium += 1
        elif row.severity == "low":
            summary.low += 1
        elif row.severity == "informational":
            summary.informational += 1
        summary.total += 1
    return summary


def create_target(db: Session, *, name: str, url: str, target_type: str, notes: str | None) -> Target:
    try:
        normalised = validate_and_normalise_url(url)
    except UrlValidationError as exc:
        raise ValueError(str(exc)) from exc

    existing = db.scalar(select(Target).where(Target.url == normalised))
    if existing:
        raise ValueError("Target URL already exists")

    target = Target(name=name.strip(), url=normalised, target_type=target_type or "website", notes=notes)
    db.add(target)
    db.commit()
    db.refresh(target)
    logger.info("target_created id=%s host=%s", target.id, host_from_url(target.url))
    return target


def assert_url_allowed_for_target(target: Target, url: str) -> str:
    normalised = validate_and_normalise_url(url)
    if not urls_same_origin(target.url, normalised) and host_from_url(target.url) != host_from_url(
        normalised
    ):
        raise ValueError("URL is not on the authorised target allowlist entry")
    return normalised


def run_scan_for_target(db: Session, target_id: str) -> Scan:
    target = db.get(Target, target_id)
    if not target:
        raise ValueError("Target not found")

    settings = get_settings()
    scan = Scan(
        target_id=target.id,
        target_url=target.url,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    logger.info("scan_started id=%s target_id=%s", scan.id, target.id)

    started = time.perf_counter()
    try:
        outcome = run_passive_scan(
            target.url,
            timeout=settings.sentinel_request_timeout_seconds,
            max_redirects=settings.sentinel_max_redirects,
            user_agent=settings.sentinel_user_agent,
        )
        for draft in outcome.findings:
            db.add(
                Finding(
                    scan_id=scan.id,
                    title=draft.title,
                    severity=draft.severity,
                    category=draft.category,
                    description=draft.description,
                    evidence=draft.evidence,
                    impact=draft.impact,
                    remediation=draft.remediation,
                    references=draft.references,
                )
            )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        scan.status = "completed"
        scan.score = float(outcome.score)
        scan.finished_at = datetime.now(timezone.utc)
        scan.duration_ms = elapsed_ms
        db.add(
            ScanResult(
                scan_id=scan.id,
                summary={
                    "score": outcome.score,
                    "score_breakdown": outcome.score_breakdown,
                    "findings_summary": outcome.findings_summary,
                    "url": outcome.url,
                },
            )
        )
        target.last_scan_at = scan.finished_at
        target.last_score = scan.score
        db.commit()
        db.refresh(scan)
        logger.info("scan_completed id=%s score=%s", scan.id, scan.score)
        return scan
    except Exception as exc:  # noqa: BLE001 - persist failure state
        scan.status = "failed"
        scan.error_summary = exc.__class__.__name__
        scan.finished_at = datetime.now(timezone.utc)
        scan.duration_ms = int((time.perf_counter() - started) * 1000)
        db.commit()
        db.refresh(scan)
        logger.info("scan_failed id=%s error=%s", scan.id, exc.__class__.__name__)
        raise
