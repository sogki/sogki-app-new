-- Optional dedicated inbox for portfolio contact form (falls back to ADMIN_EMAIL_TO)
INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('SITE_CONTACT_EMAIL_TO', 'soggymousepad@gmail.com', false, 'Inbox for public portfolio contact form')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();
