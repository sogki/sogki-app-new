-- ============================================
-- Citadel: clarify SENTINEL_API_URL for Railway
-- ============================================
-- Product UI remains Sentinel. Hosted API deploy codename is "citadel".
-- After Railway deploy, set value to the public HTTPS URL in Table Editor.
-- This migration only updates the description; it does not overwrite value.
-- ============================================

UPDATE public.keys
SET
  description = 'Citadel (Sentinel API) base URL for /admin/sentinel. Local: http://127.0.0.1:8790. Production: https://<citadel>.up.railway.app (no trailing slash).',
  is_public = true,
  updated_at = now()
WHERE key = 'SENTINEL_API_URL';

INSERT INTO public.keys (key, value, is_public, description)
SELECT
  'SENTINEL_API_URL',
  'http://127.0.0.1:8790',
  true,
  'Citadel (Sentinel API) base URL for /admin/sentinel. Local: http://127.0.0.1:8790. Production: https://<citadel>.up.railway.app (no trailing slash).'
WHERE NOT EXISTS (SELECT 1 FROM public.keys WHERE key = 'SENTINEL_API_URL');
