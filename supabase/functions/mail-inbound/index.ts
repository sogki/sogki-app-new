// Resend email.received webhook → store inbound messages in mail_messages.
// verify_jwt = false; optional Svix secret in keys.RESEND_WEBHOOK_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: keys } = await supabase
      .from('keys')
      .select('key, value')
      .in('key', ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'MAIL_DOMAIN']);

    const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
    const resendKey = keyMap['RESEND_API_KEY'];
    const webhookSecret = keyMap['RESEND_WEBHOOK_SECRET'];
    const domain = (keyMap['MAIL_DOMAIN'] || 'sogki.dev').trim().toLowerCase();

    if (!resendKey || resendKey === 'REPLACE_ME') {
      return json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const rawBody = await req.text();

    // Optional webhook verification — skip while secret is placeholder.
    if (webhookSecret && webhookSecret !== 'REPLACE_ME') {
      const ok = await verifySvix(rawBody, req.headers, webhookSecret);
      if (!ok) return json({ error: 'Invalid webhook signature' }, 401);
    }

    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { email_id?: string; to?: string[]; from?: string; subject?: string; message_id?: string };
    };

    if (event.type && event.type !== 'email.received') {
      return json({ ok: true, ignored: event.type });
    }

    const emailId = event.data?.email_id;
    if (!emailId) return json({ error: 'Missing email_id' }, 400);

    // Idempotency
    const { data: existing } = await supabase
      .from('mail_messages')
      .select('id')
      .eq('resend_email_id', emailId)
      .maybeSingle();
    if (existing) return json({ ok: true, duplicate: true, id: existing.id });

    const recvRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    const recv = await recvRes.json().catch(() => ({}));
    if (!recvRes.ok) {
      console.error('receiving fetch failed', recv);
      return json({ error: 'Failed to fetch received email', detail: recv }, 502);
    }

    const toAddresses: string[] = Array.isArray(recv.to)
      ? recv.to.map((t: string) => String(t).toLowerCase())
      : Array.isArray(event.data?.to)
        ? event.data!.to!.map((t) => t.toLowerCase())
        : [];

    const identityId = await matchIdentity(supabase, toAddresses, domain);

    const fromAddress = String(recv.from || event.data?.from || '').toLowerCase();
    const subject = String(recv.subject || event.data?.subject || '(no subject)');
    const messageId = typeof recv.message_id === 'string' ? recv.message_id : event.data?.message_id ?? null;
    const htmlBody = typeof recv.html === 'string' ? recv.html : null;
    const textBody = typeof recv.text === 'string' ? recv.text : null;
    const cc = Array.isArray(recv.cc) ? recv.cc : [];

    const row = {
      direction: 'inbound',
      identity_id: identityId,
      resend_email_id: emailId,
      from_address: fromAddress || 'unknown',
      to_addresses: toAddresses,
      cc_addresses: cc,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      message_id: messageId,
      in_reply_to: null,
      thread_key: messageId,
      is_read: false,
    };

    const { data: stored, error } = await supabase
      .from('mail_messages')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return json({ ok: true, duplicate: true });
      throw error;
    }

    return json({ ok: true, id: stored.id });
  } catch (err) {
    console.error('mail-inbound error:', err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

async function matchIdentity(supabase: any, toAddresses: string[], domain: string): Promise<string | null> {
  for (const addr of toAddresses) {
    const lower = addr.toLowerCase().replace(/^.*</, '').replace(/>.*$/, '').trim();
    if (!lower.endsWith(`@${domain}`)) continue;
    const local = lower.slice(0, -(domain.length + 1));
    const { data } = await supabase
      .from('mail_identities')
      .select('id')
      .eq('local_part', local)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

/** Minimal Svix-style check: HMAC-SHA256 of `${id}.${timestamp}.${body}` against secret. */
async function verifySvix(body: string, headers: Headers, secret: string): Promise<boolean> {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;

  // Secret may be whsec_base64
  let keyBytes: Uint8Array;
  if (secret.startsWith('whsec_')) {
    const b64 = secret.slice(6);
    const bin = atob(b64);
    keyBytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } else {
    keyBytes = new TextEncoder().encode(secret);
  }

  const toSign = `${id}.${timestamp}.${body}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(toSign));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  // svix-signature: v1,xxx v1,yyy
  const parts = signature.split(' ').map((p) => p.trim());
  for (const part of parts) {
    const [, val] = part.split(',');
    if (val && timingSafeEqual(val, expected)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
