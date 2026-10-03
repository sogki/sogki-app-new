from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.auth import require_admin
from api.core.database import get_db
from api.core.logging import get_logger
from api.models import Finding, Scan, Target
from api.schemas.dto import (
    DashboardOut,
    FindingOut,
    FindingTriageUpdate,
    FindingsSummary,
    ReportOut,
    ScanCreate,
    ScanOut,
    ScorePoint,
    TargetCreate,
    TargetHealthOut,
    TargetOut,
)
from api.services.reports import build_report, render_report_pdf
from api.services.scans import create_target, findings_summary_from_rows, run_scan_for_target

router = APIRouter(prefix="/api", dependencies=[Depends(require_admin)])
logger = get_logger("api")


def _scan_out(scan: Scan, summary: FindingsSummary | None = None) -> ScanOut:
    return ScanOut(
        id=scan.id,
        target_id=scan.target_id,
        target_url=scan.target_url,
        target_name=scan.target.name if scan.target else None,
        status=scan.status,
        score=scan.score,
        started_at=scan.started_at,
        finished_at=scan.finished_at,
        duration_ms=scan.duration_ms,
        error_summary=scan.error_summary,
        findings_summary=summary,
        created_at=scan.created_at,
    )


@router.get("/targets", response_model=list[TargetOut])
def list_targets(db: Session = Depends(get_db)) -> list[Target]:
    return list(db.scalars(select(Target).order_by(Target.created_at.desc())))


@router.post("/targets", response_model=TargetOut)
def post_target(body: TargetCreate, db: Session = Depends(get_db)) -> Target:
    try:
        return create_target(
            db,
            name=body.name,
            url=body.url,
            target_type=body.target_type,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/targets/{target_id}")
def delete_target(target_id: str, db: Session = Depends(get_db)) -> dict:
    target = db.get(Target, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    logger.info("target_deleted id=%s", target_id)
    return {"ok": True}


@router.get("/scans", response_model=list[ScanOut])
def list_scans(db: Session = Depends(get_db)) -> list[ScanOut]:
    scans = list(db.scalars(select(Scan).order_by(Scan.created_at.desc())))
    return [_scan_out(s) for s in scans]


@router.post("/scans", response_model=ScanOut)
def post_scan(body: ScanCreate, db: Session = Depends(get_db)) -> ScanOut:
    try:
        scan = run_scan_for_target(db, body.target_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        scan = db.scalar(
            select(Scan).where(Scan.target_id == body.target_id).order_by(Scan.created_at.desc())
        )
        if scan and scan.status == "failed":
            return _scan_out(scan)
        raise HTTPException(status_code=500, detail="Scan failed") from exc

    findings = list(db.scalars(select(Finding).where(Finding.scan_id == scan.id)))
    return _scan_out(scan, findings_summary_from_rows(findings))


@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: str, db: Session = Depends(get_db)) -> ScanOut:
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    findings = list(db.scalars(select(Finding).where(Finding.scan_id == scan.id)))
    return _scan_out(scan, findings_summary_from_rows(findings))


@router.get("/scans/{scan_id}/findings", response_model=list[FindingOut])
def get_findings(scan_id: str, db: Session = Depends(get_db)) -> list[Finding]:
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return list(db.scalars(select(Finding).where(Finding.scan_id == scan_id)))


@router.patch("/findings/{finding_id}", response_model=FindingOut)
def patch_finding(
    finding_id: str, body: FindingTriageUpdate, db: Session = Depends(get_db)
) -> Finding:
    finding = db.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    if body.triage_status is not None:
        finding.triage_status = body.triage_status
    if body.triage_notes is not None:
        finding.triage_notes = body.triage_notes
    db.commit()
    db.refresh(finding)
    logger.info(
        "finding_triage id=%s status=%s", finding.id, finding.triage_status
    )
    return finding


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    targets = list(db.scalars(select(Target).order_by(Target.name.asc())))
    scans = list(db.scalars(select(Scan).order_by(Scan.created_at.desc()).limit(20)))
    all_findings = list(db.scalars(select(Finding)))
    summary = findings_summary_from_rows(all_findings)
    open_summary = findings_summary_from_rows(all_findings, open_only=True)

    latest_by_target: dict[str, Scan] = {}
    for scan in db.scalars(
        select(Scan).where(Scan.status == "completed").order_by(Scan.finished_at.desc())
    ):
        if scan.target_id not in latest_by_target:
            latest_by_target[scan.target_id] = scan

    latest_score = None
    scored = [s for s in latest_by_target.values() if s.score is not None]
    if scored:
        latest_score = sum(s.score or 0 for s in scored) / len(scored)

    now = datetime.now(timezone.utc)
    target_health: list[TargetHealthOut] = []
    for target in targets:
        scan = latest_by_target.get(target.id)
        days_since = None
        open_critical = open_high = open_total = 0
        last_scan_id = None
        last_scan_at = target.last_scan_at
        last_score = target.last_score
        if scan:
            last_scan_id = scan.id
            last_scan_at = scan.finished_at or scan.created_at
            last_score = scan.score
            if last_scan_at:
                ref = last_scan_at if last_scan_at.tzinfo else last_scan_at.replace(tzinfo=timezone.utc)
                days_since = max(0, (now - ref).days)
            findings = list(db.scalars(select(Finding).where(Finding.scan_id == scan.id)))
            for f in findings:
                status = getattr(f, "triage_status", None) or "open"
                if status != "open":
                    continue
                open_total += 1
                if f.severity == "critical":
                    open_critical += 1
                elif f.severity == "high":
                    open_high += 1
        target_health.append(
            TargetHealthOut(
                target_id=target.id,
                name=target.name,
                url=target.url,
                last_score=last_score,
                last_scan_at=last_scan_at,
                last_scan_id=last_scan_id,
                days_since_scan=days_since,
                open_critical=open_critical,
                open_high=open_high,
                open_total=open_total,
            )
        )

    score_points: list[ScorePoint] = []
    for scan in reversed(
        list(
            db.scalars(
                select(Scan)
                .where(Scan.status == "completed")
                .order_by(Scan.finished_at.asc())
                .limit(30)
            )
        )
    ):
        if scan.score is None:
            continue
        score_points.append(
            ScorePoint(
                date=scan.finished_at or scan.created_at,
                score=scan.score,
                target_name=scan.target.name if scan.target else scan.target_url,
            )
        )

    total_scans = db.query(Scan).count()
    return DashboardOut(
        system_status="operational",
        security_score=round(latest_score, 1) if latest_score is not None else None,
        total_scans=total_scans,
        findings=summary,
        open_findings=open_summary,
        target_health=target_health,
        recent_scans=[_scan_out(s) for s in scans[:8]],
        recent_targets=[TargetOut.model_validate(t) for t in targets[:8]],
        score_over_time=score_points,
    )


@router.get("/reports/{scan_id}", response_model=ReportOut)
def get_report(scan_id: str, db: Session = Depends(get_db)) -> ReportOut:
    try:
        return build_report(db, scan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/reports/{scan_id}/pdf")
def get_report_pdf(scan_id: str, db: Session = Depends(get_db)) -> Response:
    try:
        report = build_report(db, scan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    pdf = render_report_pdf(report)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="sentinel-report-{scan_id[:8]}.pdf"'},
    )
