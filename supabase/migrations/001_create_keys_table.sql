-- ============================================
-- Keys Table: Primary source for env vars
-- ============================================
-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → Paste & Run
-- ============================================

-- Create the keys table
CREATE TABLE IF NOT EXISTS public.keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by key name
CREATE INDEX IF NOT EXISTS idx_keys_key ON public.keys (key);

-- Index for filtering public keys (client-safe)
CREATE INDEX IF NOT EXISTS idx_keys_is_public ON public.keys (is_public) WHERE is_public = true;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS keys_updated_at ON public.keys;
CREATE TRIGGER keys_updated_at
  BEFORE UPDATE ON public.keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_keys_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;

-- Policy: Only public keys are readable by anon/authenticated roles
-- Sensitive keys (is_public = false) are only accessible via service_role (RLS bypassed)
CREATE POLICY "Public keys are readable by all"
  ON public.keys
  FOR SELECT
  USING (is_public = true);

-- Note: service_role bypasses RLS and has full access for backend/admin operations

-- Grant usage
GRANT SELECT ON public.keys TO anon;
GRANT SELECT ON public.keys TO authenticated;
GRANT ALL ON public.keys TO service_role;

-- ============================================
-- Seed data from .env
-- ============================================
-- is_public = true: safe for client (VITE_* vars used in browser)
-- is_public = false: server-only, never exposed to client
-- ============================================

INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('VITE_SUPABASE_URL', 'https://vwdrdqkzjkfdmycomfvf.supabase.co', true, 'Supabase project URL (client-safe)'),
  ('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZHJkcWt6amtmZG15Y29tZnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTAwOTIsImV4cCI6MjA4ODYyNjA5Mn0.Gm3Jg2i6oGdVSBODFrlZ2LXnZ9lvXBdsZfF6kyUxdUo', true, 'Supabase anon key (client-safe)'),
  ('DB_PASSWORD', 'gFPcw6eNtLxboUNc', false, 'Database password (server-only)'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZHJkcWt6amtmZG15Y29tZnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MDA5MiwiZXhwIjoyMDg4NjI2MDkyfQ.nc-EOjMizqB453Cxjhv0r876ANjqW1dp0AK6e2D9ysM', false, 'Supabase service role key (server-only, never expose)'),
  ('SUPABASE_URL', 'https://vwdrdqkzjkfdmycomfvf.supabase.co', false, 'Supabase project URL (server reference)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  is_public = EXCLUDED.is_public,
  description = EXCLUDED.description,
  updated_at = now();
