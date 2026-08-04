import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BYTES = 12 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    return await handleTranscribe(req);
  } catch (err) {
    console.error('ei-transcribe error:', err);
    return json({ error: err instanceof Error ? err.message : 'Transcribe failed' }, 500);
  }
});

async function handleTranscribe(req: Request) {
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
    return json({ error: 'OPENAI_API_KEY is required for voice transcription.' }, 400);
  }

  const form = await req.formData();
  const uploaded = form.get('file');
  // Deno may give Blob instead of File
  if (!(uploaded instanceof Blob)) {
    return json({ error: 'file is required (audio recording)' }, 400);
  }
  if (uploaded.size <= 0) return json({ error: 'Empty audio recording' }, 400);
  if (uploaded.size > MAX_BYTES) return json({ error: 'Audio too large' }, 400);

  const originalName =
    uploaded instanceof File && uploaded.name ? uploaded.name : 'speech.webm';
  const type = uploaded.type || guessMime(originalName);
  const filename = ensureAudioFilename(originalName, type);
  const bytes = await uploaded.arrayBuffer();

  // Rebuild so OpenAI always gets a named file with a supported extension
  const audioFile = new File([bytes], filename, { type });

  const models = ['whisper-1', 'gpt-4o-mini-transcribe'];
  let lastError = '';

  for (const model of models) {
    const forward = new FormData();
    forward.append('file', audioFile, filename);
    forward.append('model', model);
    forward.append('language', 'en');
    forward.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: forward,
    });

    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) return json({ error: 'No speech detected in the recording' }, 422);
      return json({ text });
    }

    lastError = await res.text().catch(() => '');
    console.error('Whisper failed:', model, res.status, lastError.slice(0, 500));
  }

  const hint = summarizeOpenAiError(lastError);
  return json({ error: hint || 'OpenAI Whisper transcription failed' }, 502);
}

function guessMime(name: string): string {
  if (name.endsWith('.mp4') || name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  return 'audio/webm';
}

function ensureAudioFilename(name: string, type: string): string {
  if (/\.(webm|mp3|mp4|m4a|wav|ogg|mpeg)$/i.test(name)) return name;
  if (type.includes('mp4')) return 'speech.mp4';
  if (type.includes('ogg')) return 'speech.ogg';
  if (type.includes('wav')) return 'speech.wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'speech.mp3';
  return 'speech.webm';
}

function summarizeOpenAiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string } };
    const msg = parsed.error?.message;
    if (typeof msg === 'string' && msg.trim()) {
      // Keep toast short
      return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
    }
  } catch {
    /* not json */
  }
  if (/invalid_api_key|Incorrect API key/i.test(raw)) return 'OpenAI API key is invalid.';
  if (/insufficient_quota|billing/i.test(raw)) return 'OpenAI billing/quota issue for Whisper.';
  if (/Invalid file|format/i.test(raw)) return 'Audio format not accepted by Whisper. Try Chrome.';
  return '';
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
