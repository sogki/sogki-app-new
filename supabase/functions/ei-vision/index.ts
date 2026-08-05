import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

/**
 * Ei Vision — own camera pipeline (no OpenAI).
 * Uses Google Gemini free-tier vision via GEMINI_API_KEY in the keys table.
 * Get a free key: https://aistudio.google.com/apikey
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_IMAGE_CHARS = 6_000_000; // ~4.5MB base64 ceiling
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    return await handleVision(req);
  } catch (err) {
    console.error('ei-vision error:', err);
    return json({ error: err instanceof Error ? err.message : 'Vision failed' }, 500);
  }
});

async function handleVision(req: Request) {
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
      'GEMINI_API_KEY',
    ]);

  if (keysErr) return json({ error: 'Failed to load keys' }, 500);

  const keyMap = Object.fromEntries(
    (keys ?? []).map((row) => [row.key, typeof row.value === 'string' ? row.value.trim() : row.value])
  );
  const authErr = await verifyAdmin(req, token, keyMap);
  if (authErr) return authErr;

  const geminiKey = usable(keyMap['GEMINI_API_KEY']);
  if (!geminiKey) {
    return json(
      {
        error:
          'Add GEMINI_API_KEY to your keys table (free from https://aistudio.google.com/apikey).',
        offline_hint: true,
      },
      503
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const mode = body.mode === 'translate' ? 'translate' : 'identify';
  let imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  if (!imageBase64) return json({ error: 'imageBase64 is required' }, 400);

  const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  let mime = 'image/jpeg';
  if (dataUrlMatch) {
    mime = dataUrlMatch[1]!;
    imageBase64 = dataUrlMatch[2]!;
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return json({ error: 'Image too large — try a clearer closer shot.' }, 400);
  }

  const prompt =
    mode === 'translate'
      ? [
          'You are Ei, a pocket translator for a private personal app.',
          'Read any visible text in the image.',
          'Reply in this exact layout (plain text, bullet lines):',
          'Detected',
          '• Language: …',
          '• Text: …',
          '',
          'English',
          '• …',
          'If there is no readable text, say so briefly.',
          'Keep it short and neat. No markdown fences. Never mention Google or Gemini.',
        ].join('\n')
      : [
          'You are Ei, a pocket object identifier for a private personal app.',
          'Identify the main object or scene in the image.',
          'Reply in this exact layout (plain text, bullet lines):',
          'Object',
          '• Name: …',
          '• What it is: … (1 short line)',
          '• Notes: … (optional, 1 short line)',
          'If text in another language is prominent, also add:',
          'Text',
          '• Language: …',
          '• Translation: …',
          'Keep it short and neat. No markdown fences. Never mention Google or Gemini.',
        ].join('\n');

  const { reply, error } = await callGeminiVision({
    apiKey: geminiKey,
    prompt,
    mime,
    imageBase64,
  });

  if (error) return json({ error }, 502);
  if (!reply) return json({ error: 'Empty vision reply' }, 502);

  return json({ reply, mode, provider: 'ei-vision' });
}

async function callGeminiVision(opts: {
  apiKey: string;
  prompt: string;
  mime: string;
  imageBase64: string;
}): Promise<{ reply: string | null; error: string | null }> {
  let lastError = 'Vision request failed';

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: opts.prompt },
              {
                inline_data: {
                  mime_type: opts.mime,
                  data: opts.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 768,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('Gemini vision failed:', model, res.status, raw.slice(0, 400));
      lastError = mapGeminiError(raw, res.status);
      // New Google accounts often get limit:0 on older flash models — try the next one.
      if (
        res.status === 404 ||
        res.status === 429 ||
        /not found|not supported|no longer available|limit:\s*0/i.test(raw)
      ) {
        continue;
      }
      return { reply: null, error: lastError };
    }

    try {
      const data = JSON.parse(raw) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      };
      if (data.promptFeedback?.blockReason) {
        return { reply: null, error: 'Image was blocked by safety filters — try another shot.' };
      }
      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim();
      if (text) return { reply: text, error: null };
      // Some preview models return empty content with MAX_TOKENS — try next model
      lastError = 'Empty vision reply';
      continue;
    } catch {
      lastError = 'Vision response parse failed';
      continue;
    }
  }

  return { reply: null, error: lastError };
}

function mapGeminiError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; status?: string };
    };
    const msg = parsed.error?.message?.trim() ?? '';
    if (/API[_ ]?key|PERMISSION_DENIED|invalid/i.test(msg)) {
      return 'GEMINI_API_KEY is invalid — create a free key at aistudio.google.com/apikey';
    }
    // New accounts often show 429 with "limit: 0" on deprecated free-tier models
    if (/limit:\s*0/i.test(msg)) {
      return 'This Gemini model has no free quota on your account — Ei will try another model.';
    }
    if (/quota|rate|RESOURCE_EXHAUSTED/i.test(msg) || status === 429) {
      return 'Gemini free quota hit — wait a bit and try again.';
    }
    if (/image|media|size|payload/i.test(msg)) {
      return 'Image rejected — try a smaller/clearer photo.';
    }
    if (msg) return `Vision failed: ${msg.slice(0, 160)}`;
  } catch {
    /* ignore */
  }
  if (status === 429) return 'Gemini free quota hit — wait a bit and try again.';
  return 'Vision request failed';
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
