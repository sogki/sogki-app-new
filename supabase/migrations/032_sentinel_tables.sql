-- ============================================
-- Sentinel private security assessment tables
-- ============================================
-- Access intended via service_role / Sentinel API only.
-- Not exposed to public anon clients.
-- ============================================

CREATE TABLE IF NOT EXISTS public.sentinel_targets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  target_type   TEXT NOT NULL DEFAULT 'website',
  notes         TEXT,
  last_scan_at  TIMESTAMPTZ,
  last_score    DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sentinel_scans (
  id             TEXT PRIMARY KEY,
  target_id      TEXT NOT NULL REFERENCES public.sentinel_targets(id) ON DELETE CASCADE,
  target_url     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  score          DOUBLE PRECISION,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  duration_ms    INTEGER,
  error_summary  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_scans_target_id ON public.sentinel_scans(target_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_scans_created_at ON public.sentinel_scans(created_at DESC);

CREATE TABLE IF NOT EXISTS public.sentinel_findings (
  id            TEXT PRIMARY KEY,
  scan_id       TEXT NOT NULL REFERENCES public.sentinel_scans(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  severity      TEXT NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT NOT NULL,
  evidence      TEXT NOT NULL DEFAULT '',
  impact        TEXT NOT NULL DEFAULT '',
  remediation   TEXT NOT NULL DEFAULT '',
  reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_findings_scan_id ON public.sentinel_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_findings_severity ON public.sentinel_findings(severity);

CREATE TABLE IF NOT EXISTS public.sentinel_scan_results (
  id            TEXT PRIMARY KEY,
  scan_id       TEXT NOT NULL UNIQUE REFERENCES public.sentinel_scans(id) ON DELETE CASCADE,
  summary       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sentinel_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_scan_results ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: private to service role / Sentinel API.
