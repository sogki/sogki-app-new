import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Ei-Voice-Provider, X-Ei-Voice-Id, X-Ei-Voice-Warning',
};

const MAX_CHARS = 800;
/** Default ElevenLabs "Sarah" — only used if ELEVENLABS_VOICE_ID is missing */
const DEFAULT_ELEVEN_VOICE = 'EXAVITQu4vr4xnSDxMaL';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    return await handleSpeak(req);
  } catch (err) {
    console.error('ei-speak error:', err);
    return json({ error: err instanceof Error ? err.message : 'TTS failed' }, 500);
  }
});

async function handleSpeak(req: Request) {
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
      'ELEVENLABS_API_KEY',
      'ELEVENLABS_VOICE_ID',
    ]);

  if (keysErr) {
    console.error('keys lookup failed:', keysErr);
    return json({ error: 'Failed to load keys' }, 500);
  }

  const keyMap = Object.fromEntries(
    (keys ?? []).map((row) => [row.key, typeof row.value === 'string' ? row.value.trim() : row.value])
  );
  const authErr = await verifyAdmin(req, token, keyMap);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const raw = typeof body.text === 'string' ? body.text.trim() : '';
  if (!raw) return json({ error: 'text is required' }, 400);
  if (raw.length > MAX_CHARS) return json({ error: `text max ${MAX_CHARS} characters` }, 400);

  const spoken = raw
    .replace(/\bEi\b/g, 'Aye')
    .replace(/\bEI\b/g, 'Aye')
    .replace(/\bVUAG\.L\b/gi, 'Vanguard')
    .replace(/\bVUAG\b/gi, 'Vanguard');

  const elevenKey = usable(keyMap['ELEVENLABS_API_KEY']);
  const openaiKey = usable(keyMap['OPENAI_API_KEY']);
  const voiceId = usable(keyMap['ELEVENLABS_VOICE_ID']) ?? DEFAULT_ELEVEN_VOICE;

  // Prefer OpenAI whenever configured. Do not fall through to ElevenLabs —
  // free-plan library voices return noisy HTTP 402 errors on every request.
  if (openaiKey) {
    const audio = await openAiSpeak(openaiKey, spoken);
    if (audio) {
      return audioResponse(audio, 'openai', 'onyx');
    }
    return json({ error: 'OpenAI TTS failed. Check OPENAI_API_KEY / billing.' }, 502);
  }

  if (elevenKey) {
    const result = await elevenLabsSpeak(elevenKey, voiceId, spoken);
    if (result.ok) {
      console.log('ei-speak elevenlabs ok', { voiceId, bytes: result.audio.byteLength });
      return audioResponse(result.audio, 'elevenlabs', voiceId);
    }
    console.error('ei-speak elevenlabs failed', { voiceId, detail: result.error });
    const paid = /payment_required|paid_plan_required|Free users cannot/i.test(result.error);
    return json(
      {
        error: paid
          ? 'ElevenLabs library voices need a paid plan. Set OPENAI_API_KEY to use neural speech instead.'
          : `ElevenLabs TTS failed for the configured voice.`,
        voiceId,
      },
      paid ? 402 : 502
    );
  }

  return json(
    {
      error: 'No neural TTS configured. Set OPENAI_API_KEY in the keys table.',
    },
    400
  );
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

type ElevenResult =
  | { ok: true; audio: ArrayBuffer }
  | { ok: false; error: string };

async function elevenLabsSpeak(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<ElevenResult> {
  // Prefer turbo; fall back to multilingual. Avoid unsupported `style` on turbo.
  const attempts: Array<{ model_id: string; voice_settings: Record<string, unknown> }> = [
    {
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.8,
        use_speaker_boost: true,
      },
    },
    {
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.8,
        style: 0.4,
        use_speaker_boost: true,
      },
    },
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: attempt.model_id,
        voice_settings: attempt.voice_settings,
      }),
    });
    if (res.ok) {
      return { ok: true, audio: await res.arrayBuffer() };
    }
    const detail = await res.text().catch(() => '');
    errors.push(`${attempt.model_id}: HTTP ${res.status} ${detail.slice(0, 240)}`);
  }
  return { ok: false, error: errors.join(' | ') };
}

async function openAiSpeak(apiKey: string, text: string): Promise<ArrayBuffer | null> {
  const primary = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'onyx',
      input: text,
      instructions:
        'Clear, calm adult male voice. Natural conversational pacing — confident and composed, like a personal AI assistant. Not robotic.',
      response_format: 'mp3',
    }),
  });
  if (primary.ok) return primary.arrayBuffer();

  const fallback = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'onyx',
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!fallback.ok) {
    console.error('OpenAI TTS failed:', fallback.status, await fallback.text().catch(() => ''));
    return null;
  }
  return fallback.arrayBuffer();
}

function audioResponse(
  audio: ArrayBuffer,
  provider: string,
  voiceId: string,
  warning?: string
) {
  return new Response(audio, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Ei-Voice-Provider': provider,
      'X-Ei-Voice-Id': voiceId,
      ...(warning ? { 'X-Ei-Voice-Warning': warning } : {}),
    },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
