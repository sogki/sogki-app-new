-- Finding triage for Sentinel command centre
ALTER TABLE public.sentinel_findings
  ADD COLUMN IF NOT EXISTS triage_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS triage_notes TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_sentinel_findings_triage_status
  ON public.sentinel_findings (triage_status);
