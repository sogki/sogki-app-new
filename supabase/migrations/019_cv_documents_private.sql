-- ============================================
-- Lock down CV documents (private bucket + no public table access)
-- ============================================

-- Table: remove public read access. Only service_role (admin-api) can access.
DROP POLICY IF EXISTS "CV documents are publicly readable" ON public.cv_documents;

REVOKE SELECT ON public.cv_documents FROM anon, authenticated;

-- public_url is unused for private buckets (signed URLs are generated on demand).
ALTER TABLE public.cv_documents
  ALTER COLUMN public_url DROP NOT NULL;

COMMENT ON TABLE public.cv_documents IS
  'Private CV metadata. Access only via admin-api (service_role). Files live in private storage bucket cv-documents.';

COMMENT ON COLUMN public.cv_documents.public_url IS
  'Deprecated for private bucket. Prefer file_path + createSignedUrl via admin-api.';

-- Storage: ensure private bucket exists and only service_role can touch objects.
-- Dashboard: create bucket "cv-documents" with Public = OFF if it does not exist yet.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-documents',
  'cv-documents',
  false,
  15728640, -- 15 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'text/rtf'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Deny anon/authenticated storage access explicitly (service_role bypasses RLS).
DROP POLICY IF EXISTS "CV documents storage public read" ON storage.objects;
DROP POLICY IF EXISTS "CV documents storage authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "CV documents storage authenticated write" ON storage.objects;

-- No permissive policies for cv-documents: anon/authenticated cannot list/read/write.
-- Admin edge functions use the service role key and bypass storage RLS.
