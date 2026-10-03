-- ============================================
-- Sentinel connection URL in public.keys
-- ============================================
-- Frontend reads SENTINEL_API_URL (is_public) for the local FastAPI base.
-- Auth reuses existing private keys: ADMIN_DEV_TOKEN, ADMIN_JWT_SECRET.
-- Do not commit live secrets; set values in Supabase Table Editor if needed.
-- ============================================

INSERT INTO public.keys (key, value, is_public, description) VALUES
  (
    'SENTINEL_API_URL',
    'http://127.0.0.1:8790',
    true,
    'Base URL for the local Sentinel FastAPI service used by /admin/sentinel'
  )
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = now();
