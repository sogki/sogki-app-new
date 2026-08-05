const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    // Honeypot — bots fill hidden field
    if (typeof body.website === 'string' && body.website.trim()) {
      return json({ ok: true });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || name.length < 2) return json({ error: 'Please enter your name.' }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }
    if (!message || message.length < 10) {
      return json({ error: 'Message must be at least 10 characters.' }, 400);
    }
    if (message.length > 5000) return json({ error: 'Message is too long.' }, 400);

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: keys } = await supabase
      .from('keys')
      .select('key, value')
      .in('key', ['RESEND_API_KEY', 'ADMIN_EMAIL_TO', 'ADMIN_EMAIL_FROM', 'SITE_CONTACT_EMAIL_TO']);

    const keyMap = Object.fromEntries((keys ?? []).map((row) => [row.key, row.value]));
    const resendKey = keyMap['RESEND_API_KEY'];
    const emailTo = keyMap['SITE_CONTACT_EMAIL_TO'] || keyMap['ADMIN_EMAIL_TO'];
    const emailFrom = keyMap['ADMIN_EMAIL_FROM'] || 'Sogki Portfolio <onboarding@resend.dev>';

    if (!resendKey || resendKey === 'REPLACE_ME' || !emailTo) {
      return json({ error: 'Contact form is not configured yet.' }, 503);
    }

    const emailSubject = subject
      ? `[Portfolio] ${subject}`
      : `[Portfolio] Message from ${name}`;

    const html = `
      <h2>New portfolio contact</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      <p style="color:#666;font-size:12px">Reply directly to ${escapeHtml(email)} to respond.</p>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        reply_to: email,
        subject: emailSubject,
        html,
      }),
    });

    const resendBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error('site-contact resend error:', resendBody);
      return json({ error: 'Failed to send email. Try again later.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('site-contact error:', err);
    return json({ error: 'Something went wrong.' }, 500);
  }
});
