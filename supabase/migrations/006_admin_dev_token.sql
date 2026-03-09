-- ============================================
-- Admin Dev Token (optional, for localhost bypass)
-- ============================================
-- Add ADMIN_DEV_TOKEN to keys table.
-- Generate a random string (e.g. openssl rand -hex 32) and set it here.
-- Add the same value to .env.local as VITE_ADMIN_DEV_TOKEN.
-- When running on localhost with both set, Discord OAuth is skipped.
-- ============================================

INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('ADMIN_DEV_TOKEN', 'REPLACE_ME', false, 'Optional: token for localhost dev bypass. Generate with: openssl rand -hex 32. Add same value to .env.local as VITE_ADMIN_DEV_TOKEN.')
ON CONFLICT (key) DO NOTHING;
