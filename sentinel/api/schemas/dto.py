from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TargetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=3, max_length=2048)
    target_type: str = "website"
    notes: str | None = None


class TargetOut(BaseModel):
    id: str
    name: str
    url: str
    target_type: str
    notes: str | None
    last_scan_at: datetime | None
    last_score: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScanCreate(BaseModel):
    target_id: str


class FindingsSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0
    total: int = 0


class ScanOut(BaseModel):
    id: str
    target_id: str
    target_url: str
    target_name: str | None = None
    status: str
    score: float | None
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: int | None
    error_summary: str | None
    findings_summary: FindingsSummary | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FindingOut(BaseModel):
    id: str
    scan_id: str
    title: str
    severity: str
    category: str
    description: str
    evidence: str
    impact: str
    remediation: str
    references: list[str]
    triage_status: str = "open"
    triage_notes: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class FindingTriageUpdate(BaseModel):
    triage_status: Literal["open", "accepted", "fixed"] | None = None
    triage_notes: str | None = Field(default=None, max_length=4000)


class ScorePoint(BaseModel):
    date: datetime
    score: float
    target_name: str


class TargetHealthOut(BaseModel):
    target_id: str
    name: str
    url: str
    last_score: float | None
    last_scan_at: datetime | None
    last_scan_id: str | None
    days_since_scan: int | None
    open_critical: int = 0
    open_high: int = 0
    open_total: int = 0


class DashboardOut(BaseModel):
    system_status: str
    security_score: float | None
    total_scans: int
    findings: FindingsSummary
    open_findings: FindingsSummary
    target_health: list[TargetHealthOut]
    recent_scans: list[ScanOut]
    recent_targets: list[TargetOut]
    score_over_time: list[ScorePoint]


class ReportOut(BaseModel):
    id: str
    scan_id: str
    target_name: str
    target_url: str
    scan_date: datetime
    score: float | None
    executive_summary: str
    findings: list[FindingOut]
    findings_summary: FindingsSummary
    limitations: str
    recommendations: list[str]
