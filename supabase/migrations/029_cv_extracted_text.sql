-- CV text extraction for Ei assistant (read CV contents)
ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.cv_documents.extracted_text IS 'Plain text extracted from the uploaded CV file for Ei chat tools';
COMMENT ON COLUMN public.cv_documents.extracted_at IS 'When extracted_text was last refreshed';
