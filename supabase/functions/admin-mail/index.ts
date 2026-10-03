// Admin Mail Centre API — identities, inbox/sent, compose/send/reply via Resend.
// Auth: Discord admin JWT or localhost ADMIN_DEV_TOKEN (same pattern as admin-cv-email).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const LOCAL_PART_RE = /^[a-z0-9][a-z0-9._+-]{0,63}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { supabase, keyMap } = auth;
    const url = new URL(req.url);
    const match = url.pathname.match(/\/admin-mail(?:\/(.*))?$/i);
    const relative = match ? (match[1] ?? '') : url.pathname.replace(/^\/+/, '');
    const parts = relative.replace(/^\/+/, '').split('/').filter(Boolean);

    if (req.method === 'GET') {
      return await handleGet(supabase, keyMap, parts, url);
    }

    const body = req.method !== 'DELETE' ? await req.json().catch(() => ({})) : {};
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
      return await handleMutate(supabase, keyMap, req.method, parts, body);
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('admin-mail error:', err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: json({ error: 'Unauthorized' }, 401) };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', [
      'ADMIN_DISCORD_USER_ID',
      'ADMIN_JWT_SECRET',
      'ADMIN_DEV_TOKEN',
      'RESEND_API_KEY',
      'MAIL_DOMAIN',
    ]);

  const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];
  const devToken = keyMap['ADMIN_DEV_TOKEN'];

  const origin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
  const validDevToken = devToken && devToken.length >= 32 && devToken !== 'REPLACE_ME';

  if (!(isLocalhost && validDevToken && token === devToken)) {
    if (!allowedUserId || !jwtSecret) return { error: json({ error: 'Config error' }, 500) };
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      if ((payload.sub as string) !== allowedUserId) {
        return { error: json({ error: 'Unauthorized' }, 401) };
      }
    } catch {
      return { error: json({ error: 'Invalid token' }, 401) };
    }
  }

  return { supabase, keyMap, error: null as Response | null };
}

async function handleGet(supabase: any, keyMap: Record<string, string>, parts: string[], url: URL) {
  const [resource, id] = parts;
  const domain = (keyMap['MAIL_DOMAIN'] || 'sogki.dev').trim().toLowerCase();

  if (resource === 'meta' || (!resource && parts.length === 0)) {
    return json({ domain });
  }

  if (resource === 'identities') {
    if (id) {
      const { data, error } = await supabase.from('mail_identities').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Not found' }, 404);
      return json(enrichIdentity(data, domain));
    }
    const { data, error } = await supabase
      .from('mail_identities')
      .select('*')
      .order('local_part', { ascending: true });
    if (error) throw error;
    return json((data ?? []).map((row: any) => enrichIdentity(row, domain)));
  }

  if (resource === 'messages') {
    if (id) {
      const { data, error } = await supabase.from('mail_messages').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Not found' }, 404);
      return json(data);
    }
    const box = url.searchParams.get('box') || 'inbox';
    const direction = box === 'sent' ? 'outbound' : 'inbound';
    const { data, error } = await supabase
      .from('mail_messages')
      .select(
        'id, direction, identity_id, resend_email_id, from_address, to_addresses, cc_addresses, subject, message_id, in_reply_to, thread_key, is_read, created_at'
      )
      .eq('direction', direction)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return json(data ?? []);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleMutate(
  supabase: any,
  keyMap: Record<string, string>,
  method: string,
  parts: string[],
  body: Record<string, unknown>
) {
  const [resource, id] = parts;
  const domain = (keyMap['MAIL_DOMAIN'] || 'sogki.dev').trim().toLowerCase();

  if (resource === 'identities') {
    if (method === 'POST') {
      const local = String(body.local_part ?? '')
        .trim()
        .toLowerCase();
      if (!LOCAL_PART_RE.test(local)) {
        return json({ error: 'Invalid local_part (use a-z, 0-9, . _ + -)' }, 400);
      }
      const row = {
        local_part: local,
        display_name: String(body.display_name ?? '').trim(),
        signature_html: String(body.signature_html ?? ''),
        signature_text: String(body.signature_text ?? ''),
        is_active: body.is_active !== false,
      };
      const { data, error } = await supabase.from('mail_identities').insert(row).select('*').single();
      if (error) {
        if (String(error.message || '').includes('unique') || error.code === '23505') {
          return json({ error: 'That address already exists' }, 409);
        }
        throw error;
      }
      return json(enrichIdentity(data, domain), 201);
    }

    if (!id) return json({ error: 'ID required' }, 400);

    if (method === 'PATCH' || method === 'PUT') {
      const patch: Record<string, unknown> = {};
      if (body.display_name != null) patch.display_name = String(body.display_name).trim();
      if (body.signature_html != null) patch.signature_html = String(body.signature_html);
      if (body.signature_text != null) patch.signature_text = String(body.signature_text);
      if (body.is_active != null) patch.is_active = Boolean(body.is_active);
      if (body.local_part != null) {
        const local = String(body.local_part).trim().toLowerCase();
        if (!LOCAL_PART_RE.test(local)) {
          return json({ error: 'Invalid local_part' }, 400);
        }
        patch.local_part = local;
      }
      const { data, error } = await supabase
        .from('mail_identities')
        .update(patch)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Not found' }, 404);
      return json(enrichIdentity(data, domain));
    }

    if (method === 'DELETE') {
      const { error } = await supabase.from('mail_identities').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true });
    }
  }

  if (resource === 'messages' && id && (method === 'PATCH' || method === 'PUT')) {
    const patch: Record<string, unknown> = {};
    if (body.is_read != null) patch.is_read = Boolean(body.is_read);
    const { data, error } = await supabase
      .from('mail_messages')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'Not found' }, 404);
    return json(data);
  }

  if (resource === 'send' && method === 'POST') {
    return await handleSend(supabase, keyMap, body, domain);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleSend(
  supabase: any,
  keyMap: Record<string, string>,
  body: Record<string, unknown>,
  domain: string
) {
  const resendKey = keyMap['RESEND_API_KEY'];
  if (!resendKey || resendKey === 'REPLACE_ME') {
    return json({ error: 'Missing RESEND_API_KEY in keys table' }, 400);
  }

  const identityId = String(body.identity_id ?? '');
  const toRaw = body.to;
  const toList = Array.isArray(toRaw)
    ? toRaw.map((t) => String(t).trim()).filter(Boolean)
    : String(toRaw ?? '')
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);

  if (!identityId) return json({ error: 'identity_id required' }, 400);
  if (!toList.length) return json({ error: 'to required' }, 400);

  const subject = String(body.subject ?? '').trim();
  if (!subject) return json({ error: 'subject required' }, 400);

  const htmlBody = String(body.html ?? body.html_body ?? '');
  const textBody = String(body.text ?? body.text_body ?? '');
  if (!htmlBody.trim() && !textBody.trim()) {
    return json({ error: 'html or text body required' }, 400);
  }

  const { data: identity, error: idErr } = await supabase
    .from('mail_identities')
    .select('*')
    .eq('id', identityId)
    .maybeSingle();
  if (idErr) throw idErr;
  if (!identity || !identity.is_active) {
    return json({ error: 'Identity not found or inactive' }, 404);
  }

  const fromAddress = `${identity.local_part}@${domain}`;
  const fromHeader = identity.display_name
    ? `${identity.display_name} <${fromAddress}>`
    : fromAddress;

  const signedHtml = appendSignatureHtml(htmlBody || textToHtml(textBody), identity.signature_html);
  const signedText = appendSignatureText(textBody || stripHtml(htmlBody), identity.signature_text);

  const replyToMessageId = typeof body.reply_to_message_id === 'string' ? body.reply_to_message_id : null;
  let inReplyTo: string | null = null;
  let threadKey: string | null = null;
  const headers: Record<string, string> = {};

  if (replyToMessageId) {
    const { data: original } = await supabase
      .from('mail_messages')
      .select('*')
      .eq('id', replyToMessageId)
      .maybeSingle();
    if (original?.message_id) {
      inReplyTo = original.message_id;
      headers['In-Reply-To'] = original.message_id;
      headers['References'] = original.message_id;
    }
    threadKey = original?.thread_key || original?.message_id || original?.id || null;
  }

  const payload: Record<string, unknown> = {
    from: fromHeader,
    to: toList,
    subject,
    html: signedHtml,
    text: signedText,
  };
  if (Object.keys(headers).length) payload.headers = headers;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const resendBody = await resendRes.json().catch(() => ({}));
  if (!resendRes.ok) {
    return json({ error: `Resend failed: ${JSON.stringify(resendBody)}` }, 502);
  }

  const resendId = typeof resendBody.id === 'string' ? resendBody.id : null;
  const row = {
    direction: 'outbound',
    identity_id: identity.id,
    resend_email_id: resendId,
    from_address: fromAddress,
    to_addresses: toList,
    cc_addresses: [],
    subject,
    html_body: signedHtml,
    text_body: signedText,
    message_id: null,
    in_reply_to: inReplyTo,
    thread_key: threadKey,
    is_read: true,
  };

  const { data: stored, error: storeErr } = await supabase
    .from('mail_messages')
    .insert(row)
    .select('*')
    .single();
  if (storeErr) throw storeErr;

  return json({ ok: true, message: stored, resend: resendBody }, 201);
}

function enrichIdentity(row: any, domain: string) {
  return {
    ...row,
    email: `${row.local_part}@${domain}`,
    domain,
  };
}

function appendSignatureHtml(body: string, signatureHtml: string): string {
  const sig = (signatureHtml || '').trim();
  if (!sig) return body;
  return `${body}<br/><br/>--<br/>${sig}`;
}

function appendSignatureText(body: string, signatureText: string): string {
  const sig = (signatureText || '').trim();
  if (!sig) return body;
  return `${body}\n\n--\n${sig}`;
}

function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('');
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
