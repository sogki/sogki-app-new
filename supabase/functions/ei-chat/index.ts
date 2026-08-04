import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 600;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    return await handleChat(req);
  } catch (err) {
    console.error('ei-chat error:', err);
    return json({ error: err instanceof Error ? err.message : 'Chat failed' }, 500);
  }
});

async function handleChat(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys, error: keysErr } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', [
      'ADMIN_DISCORD_USER_ID',
      'ADMIN_JWT_SECRET',
      'ADMIN_DEV_TOKEN',
      'OPENAI_API_KEY',
    ]);

  if (keysErr) return json({ error: 'Failed to load keys' }, 500);

  const keyMap = Object.fromEntries(
    (keys ?? []).map((row) => [row.key, typeof row.value === 'string' ? row.value.trim() : row.value])
  );
  const authErr = await verifyAdmin(req, token, keyMap);
  if (authErr) return authErr;

  const openaiKey = usable(keyMap['OPENAI_API_KEY']);
  if (!openaiKey) {
    return json({ error: 'OPENAI_API_KEY is required for Ei to reply.' }, 400);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'message is required' }, 400);
  if (message.length > MAX_CHARS) return json({ error: `message max ${MAX_CHARS} characters` }, 400);

  const context =
    typeof body.context === 'string' && body.context.trim() ? body.context.trim().slice(0, 1200) : '';

  const system = [
    `You are Ei (pronounced Aye), a personal assistant on a private life dashboard.`,
    'Talk like a real person out loud: warm, clear, natural British conversational English.',
    'Use full flowing sentences. Avoid telegram style, label dumps, or clipped phrases like "Weather in X. High Y. Low Z."',
    'Keep replies short — usually one or two sentences — unless more detail is needed.',
    'Never mention being an AI model or OpenAI. No markdown, bullets, or lists — plain speech only.',
    'Do not address the user by name. Prefer you / your.',
    'Say Vanguard instead of VUAG when talking about that investment.',
    context ? `Dashboard context you can draw on naturally: ${context}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 180,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('OpenAI chat failed:', res.status, detail);
    return json({ error: 'OpenAI chat request failed' }, 502);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: 'Empty reply from model' }, 502);

  return json({ reply });
}

async function verifyAdmin(
  req: Request,
  token: string,
  keyMap: Record<string, string>
): Promise<Response | null> {
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];
  const devToken = keyMap['ADMIN_DEV_TOKEN'];
  const origin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
  const validDevToken = Boolean(devToken && devToken.length >= 32 && devToken !== 'REPLACE_ME');
  if (isLocalhost && validDevToken && token === devToken) return null;

  if (!allowedUserId || !jwtSecret) return json({ error: 'Config error' }, 500);
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    if ((payload.sub as string) !== allowedUserId) return json({ error: 'Unauthorized' }, 401);
  } catch {
    return json({ error: 'Invalid token' }, 401);
  }
  return null;
}

function usable(value: string | undefined): string | null {
  if (!value || value === 'REPLACE_ME') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
