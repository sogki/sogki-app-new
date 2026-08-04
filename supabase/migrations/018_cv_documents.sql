-- ============================================
-- CV documents for admin management
-- ============================================

CREATE TABLE IF NOT EXISTS public.cv_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL UNIQUE,
  public_url  TEXT, -- unused with private bucket; signed URLs generated on demand
  mime_type   TEXT NOT NULL,
  size        INT NOT NULL CHECK (size >= 0),
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_created_at ON public.cv_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_documents_is_active ON public.cv_documents (is_active);

CREATE OR REPLACE FUNCTION public.update_cv_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_documents_updated_at ON public.cv_documents;
CREATE TRIGGER cv_documents_updated_at
BEFORE UPDATE ON public.cv_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_cv_documents_updated_at();

ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;

-- Private: no policies for anon/authenticated. Access only via service_role (admin-api).
-- Do not grant SELECT to anon/authenticated.

-- Add required keys (fill with your real values later)
INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('RESEND_API_KEY', 'REPLACE_ME', false, 'Resend API key used by admin-cv-email function'),
  ('ADMIN_EMAIL_TO', 'you@example.com', false, 'Email address to receive CV exports'),
  ('ADMIN_EMAIL_FROM', 'Sogki Admin <onboarding@resend.dev>', false, 'From email for CV exports')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

-- Storage bucket:
--   Bucket name: cv-documents
--   Public bucket: OFF (private; use signed URLs via admin-api)
--   Prefer applying migration 019_cv_documents_private.sql which creates the bucket.
