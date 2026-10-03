-- ============================================
-- Admin Mail Centre (Resend-backed)
-- Identities = dynamic from-addresses + signatures
-- Messages = inbound webhook store + outbound copies
-- ============================================

CREATE TABLE IF NOT EXISTS public.mail_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_part TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  signature_html TEXT NOT NULL DEFAULT '',
  signature_text TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mail_identities_local_part_format CHECK (local_part ~ '^[a-z0-9][a-z0-9._+-]{0,63}$'),
  CONSTRAINT mail_identities_local_part_unique UNIQUE (local_part)
);

CREATE TABLE IF NOT EXISTS public.mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  identity_id UUID REFERENCES public.mail_identities(id) ON DELETE SET NULL,
  resend_email_id TEXT,
  from_address TEXT NOT NULL,
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT,
  text_body TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  thread_key TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_created_at ON public.mail_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_direction ON public.mail_messages (direction);
CREATE INDEX IF NOT EXISTS idx_mail_messages_identity_id ON public.mail_messages (identity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_messages_resend_email_id_unique
  ON public.mail_messages (resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_mail_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mail_identities_updated_at ON public.mail_identities;
CREATE TRIGGER mail_identities_updated_at
  BEFORE UPDATE ON public.mail_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_mail_identities_updated_at();

ALTER TABLE public.mail_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
-- No anon policies: service role / Edge Functions only.

GRANT ALL ON public.mail_identities TO service_role;
GRANT ALL ON public.mail_messages TO service_role;

INSERT INTO public.keys (key, value, is_public, description) VALUES
  (
    'MAIL_DOMAIN',
    'sogki.dev',
    false,
    'Domain for admin mail identities (must be verified in Resend for send + MX for receive)'
  ),
  (
    'RESEND_WEBHOOK_SECRET',
    'REPLACE_ME',
    false,
    'Optional Svix signing secret from Resend webhook (email.received). Leave REPLACE_ME to skip verify in early setup.'
  )
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();
