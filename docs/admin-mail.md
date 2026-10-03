# Admin Mail Centre (Resend)

Private mail UI at `/admin/mail`. Resend handles send/receive; Supabase stores identities and messages.

## Prerequisites

1. **Sending domain** verified in Resend (same domain as CV/contact emails).
2. **Receiving** enabled on that domain (Resend dashboard → Domains → Receiving / MX records).
3. Keys in Supabase `keys` table:
   - `RESEND_API_KEY` — already used by site-contact / admin-cv-email
   - `MAIL_DOMAIN` — default `sogki.dev` (migration `037_admin_mail.sql`)
   - `RESEND_WEBHOOK_SECRET` — set after creating the webhook (optional until then; leave `REPLACE_ME` to skip signature checks)

## Deploy Edge Functions

```bash
npx supabase db push
# or run supabase/migrations/037_admin_mail.sql in the SQL editor

npx supabase functions deploy admin-mail --no-verify-jwt
npx supabase functions deploy mail-inbound --no-verify-jwt
```

`supabase/config.toml` already sets `verify_jwt = false` for both.

## Resend webhook (inbound)

1. Resend → **Webhooks** → Add Webhook  
2. Endpoint:  
   `https://<PROJECT_REF>.supabase.co/functions/v1/mail-inbound`  
3. Event: **`email.received`**  
4. Copy the signing secret into `keys.RESEND_WEBHOOK_SECRET`

Any address `@MAIL_DOMAIN` can receive once MX is correct. Creating an identity in admin (e.g. `hello`) does **not** call Resend — it only registers the from-address + signature in your DB and helps match inbound `to` → identity.

## Using the admin UI

1. Open `/admin/mail` → **Identities**  
2. Create `hello` (+ display name + HTML/text signature)  
3. **Compose** — pick identity, send (signature appended automatically)  
4. **Inbox** — messages appear after someone emails that address (webhook + fetch)

## Limitations (v1)

- Not a full mailbox client (no IMAP sync of personal Gmail)
- Contact form still uses `site-contact` (does not write inbox rows)
- Attachment download UI deferred (bodies are stored)
- One domain via `MAIL_DOMAIN`
