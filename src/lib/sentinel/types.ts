export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type TriageStatus = 'open' | 'accepted' | 'fixed';

export type Finding = {
  id: string;
  scan_id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  evidence: string;
  impact: string;
  remediation: string;
  references: string[];
  triage_status: TriageStatus;
  triage_notes: string;
  created_at: string;
};

export type TargetHealth = {
  target_id: string;
  name: string;
  url: string;
  last_score: number | null;
  last_scan_at: string | null;
  last_scan_id: string | null;
  days_since_scan: number | null;
  open_critical: number;
  open_high: number;
  open_total: number;
};

export type Target = {
  id: string;
  name: string;
  url: string;
  target_type: string;
  notes: string | null;
  last_scan_at: string | null;
  last_score: number | null;
  created_at: string;
  updated_at: string;
};

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Scan = {
  id: string;
  target_id: string;
  target_url: string;
  target_name?: string;
  status: ScanStatus;
  score: number | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_summary: string | null;
  findings_summary?: FindingsSummary;
  created_at: string;
};

export type FindingsSummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  total: number;
};

export type DashboardData = {
  system_status: 'operational' | 'degraded' | 'offline';
  security_score: number | null;
  total_scans: number;
  findings: FindingsSummary;
  open_findings: FindingsSummary;
  target_health: TargetHealth[];
  recent_scans: Scan[];
  recent_targets: Target[];
  score_over_time: { date: string; score: number; target_name: string }[];
};

export type Report = {
  id: string;
  scan_id: string;
  target_name: string;
  target_url: string;
  scan_date: string;
  score: number | null;
  executive_summary: string;
  findings: Finding[];
  findings_summary: FindingsSummary;
  limitations: string;
  recommendations: string[];
};

export type HealthResponse = {
  codename?: string;
  status: string;
  service: string;
  version: string;
};
