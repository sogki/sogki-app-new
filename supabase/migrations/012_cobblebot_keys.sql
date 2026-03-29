-- Cobblebot Discord integration keys (server-only)
-- NOTE: Fill values in Supabase dashboard/SQL editor; do not commit live secrets.

INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('cobblebot_token', 'REPLACE_ME', false, 'Discord bot token for cobble server status notifications'),
  ('cobblebot_client_id', 'REPLACE_ME', false, 'Discord bot client id for cobble server integrations'),
  ('cobblebot_client_secret', 'REPLACE_ME', false, 'Discord bot client secret for cobble server integrations'),
  ('cobblebot_channel_id', 'REPLACE_ME', false, 'Discord channel id for cobble server status notifications')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();
