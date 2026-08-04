import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 800;
/** Default ElevenLabs "Sarah" — clear female conversational voice */
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

  const { data: keys } = await supabase
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

  const keyMap = Object.fromEntries((keys ?? []).map((row) => [row.key, row.value]));
  const authErr = await verifyAdmin(req, token, keyMap);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const raw = typeof body.text === 'string' ? body.text.trim() : '';
  if (!raw) return json({ error: 'text is required' }, 400);
  if (raw.length > MAX_CHARS) return json({ error: `text max ${MAX_CHARS} characters` }, 400);

  const spoken = raw.replace(/\bEi\b/g, 'Aye').replace(/\bEI\b/g, 'Aye');

  const elevenKey = usable(keyMap['ELEVENLABS_API_KEY']);
  const openaiKey = usable(keyMap['OPENAI_API_KEY']);

  if (elevenKey) {
    const voiceId =
      usable(keyMap['ELEVENLABS_VOICE_ID']) ?? DEFAULT_ELEVEN_VOICE;
    const audio = await elevenLabsSpeak(elevenKey, voiceId, spoken);
    if (audio) {
      return audioResponse(audio, 'elevenlabs');
    }
  }

  if (openaiKey) {
    const audio = await openAiSpeak(openaiKey, spoken);
    if (audio) {
      return audioResponse(audio, 'openai');
    }
  }

  return json(
    {
      error:
        'No neural TTS configured. Add ELEVENLABS_API_KEY (best) or OPENAI_API_KEY to the keys table, then redeploy ei-speak.',
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
  return value;
}

async function elevenLabsSpeak(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<ArrayBuffer | null> {
  // eleven_turbo_v2_5 is fast + natural; fall back to multilingual v2
  const models = ['eleven_turbo_v2_5', 'eleven_multilingual_v2'];
  for (const model_id of models) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: {
          // Lower stability = more human variation; too high sounds flat/robotic
          stability: 0.32,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    });
    if (res.ok) return res.arrayBuffer();
    console.error('ElevenLabs TTS failed:', model_id, res.status, await res.text().catch(() => ''));
  }
  return null;
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
      voice: 'coral',
      input: text,
      instructions:
        'Warm clear young woman. Natural conversational pacing with soft pauses. Not robotic. Pronounce Aye like the English word aye (rhymes with day).',
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
      voice: 'nova',
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

function audioResponse(audio: ArrayBuffer, provider: string) {
  return new Response(audio, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Ei-Voice-Provider': provider,
    },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
