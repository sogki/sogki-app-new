-- Preview image path for CV email inline thumbnails (generated in browser on upload)
ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS preview_path TEXT;

COMMENT ON COLUMN public.cv_documents.preview_path IS
  'Private storage path to first-page PNG preview for email/admin display.';
