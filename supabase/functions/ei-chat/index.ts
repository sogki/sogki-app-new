import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';
import { extractAndStoreCvText } from '../_shared/cvTextExtract.ts';

/**
 * Ei chat — Gemini free tier with Life Dashboard + CV tools (read/write).
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 600;
const MAX_TOOL_ROUNDS = 4;
const CV_TEXT_CHAT_CAP = 24_000;
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
];

type ToolCtx = {
  supabase: ReturnType<typeof createClient>;
  didMutate: boolean;
};

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
      'GEMINI_API_KEY',
    ]);

  if (keysErr) return json({ error: 'Failed to load keys' }, 500);

  const keyMap = Object.fromEntries(
    (keys ?? []).map((row) => [row.key, typeof row.value === 'string' ? row.value.trim() : row.value])
  );
  const authErr = await verifyAdmin(req, token, keyMap);
  if (authErr) return authErr;

  const geminiKey = usable(keyMap['GEMINI_API_KEY']);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'message is required' }, 400);
  if (message.length > MAX_CHARS) return json({ error: `message max ${MAX_CHARS} characters` }, 400);

  if (!geminiKey) {
    return json(
      {
        error: 'GEMINI_API_KEY is required for Ei cloud chat.',
        offline_hint: true,
      },
      503
    );
  }

  const clientContext =
    typeof body.context === 'string' && body.context.trim() ? body.context.trim().slice(0, 1200) : '';

  const seed = await buildSeedContext(supabase);
  const system = [
    `You are Ei (pronounced Aye), a personal assistant on a private life dashboard and phone companion.`,
    'Talk like a real person: warm, clear, natural British conversational English.',
    'Keep replies short and useful — prefer a few tight lines over a long essay.',
    'You can answer practical questions (time, places, what something means) as well as dashboard topics.',
    'Never mention being an AI model, Google, Gemini, or OpenAI.',
    'You may use light markdown for emphasis: **bold**, *italic*, and bullet lists (- item). Avoid headings and code fences unless listing structured facts.',
    'Do not address the user by name. Prefer you / your.',
    'Say Vanguard instead of VUAG when talking about that investment.',
    'You have tools to read and update the Life Dashboard and CVs.',
    'Use tools when you need live data or when the user asks you to change something (notes, habits, goals, reminders, job search, CV notes/title/active).',
    'For questions about applying / CVs / resume content: list_cvs then get_cv for the relevant document(s) — never invent CV contents.',
    'When you change data, briefly confirm what you updated.',
    'If you lack live data you cannot fetch with tools, say so briefly.',
    seed ? `Seed context (may be stale — prefer tools for accuracy): ${seed}` : '',
    clientContext ? `Client hint: ${clientContext}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toolCtx: ToolCtx = { supabase, didMutate: false };
  const { reply, error } = await callGeminiChat({
    apiKey: geminiKey,
    system,
    message,
    toolCtx,
  });

  if (error) return json({ error }, 502);
  if (!reply) return json({ error: 'Empty reply from model' }, 502);

  return json({ reply, didMutate: toolCtx.didMutate });
}

async function buildSeedContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const [{ data: dash }, { data: cvs }, { data: inv }] = await Promise.all([
      supabase.from('life_dashboard_state').select('payload').eq('key', 'default').maybeSingle(),
      supabase
        .from('cv_documents')
        .select('id, title, notes, is_active, extracted_at')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase.from('life_investments').select('symbol, holdings, invested, name').limit(5),
    ]);
    const payload = (dash?.payload ?? {}) as Record<string, unknown>;
    const job = (payload.jobSearch ?? {}) as Record<string, unknown>;
    const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
    const openReminders = reminders
      .filter((r: { done?: boolean }) => !r.done)
      .map((r: { title?: string }) => r.title)
      .filter(Boolean)
      .slice(0, 6)
      .join('; ');
    const cvBits = (cvs ?? [])
      .map(
        (c: { title?: string; is_active?: boolean; extracted_at?: string | null }) =>
          `${c.title}${c.is_active ? '' : ' (inactive)'}${c.extracted_at ? '' : ' (no text yet)'}`
      )
      .join('; ');
    const invBits = (inv ?? [])
      .map((r: { symbol?: string; holdings?: number }) => `${r.symbol}:${r.holdings}`)
      .join(', ');
    return [
      `jobSearch applications=${job.applicationsSent ?? '?'} interviews=${job.interviews ?? '?'} offers=${job.offers ?? '?'}`,
      openReminders ? `openReminders: ${openReminders}` : '',
      cvBits ? `CVs: ${cvBits}` : 'CVs: none',
      invBits ? `holdings: ${invBits}` : '',
    ]
      .filter(Boolean)
      .join('. ')
      .slice(0, 900);
  } catch (e) {
    console.error('seed context failed', e);
    return '';
  }
}

const TOOL_DECLARATIONS = [
  {
    name: 'get_dashboard',
    description: 'Load the full Life Dashboard payload (habits, goals, notes, reminders, reading, job search, life projects, weather, links).',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'update_dashboard',
    description:
      'Deep-merge a patch into the Life Dashboard payload. Use for notes/habits/goals/reminders/jobSearch/reading/projects/links/weather. Arrays replace entirely when provided.',
    parameters: {
      type: 'OBJECT',
      properties: {
        patch: {
          type: 'OBJECT',
          description: 'Partial Life Dashboard payload to merge',
        },
      },
      required: ['patch'],
    },
  },
  {
    name: 'list_cvs',
    description: 'List saved CVs with id, title, notes, is_active, and whether extracted text is available.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_cv',
    description:
      'Load one CV including extracted plain text from the file. Extracts on demand if missing. Use before giving CV-based career advice.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'CV document UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_cv',
    description: 'Update CV metadata only (title, notes, is_active). Cannot upload or delete files.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING' },
        title: { type: 'STRING' },
        notes: { type: 'STRING' },
        is_active: { type: 'BOOLEAN' },
      },
      required: ['id'],
    },
  },
];

async function callGeminiChat(opts: {
  apiKey: string;
  system: string;
  message: string;
  toolCtx: ToolCtx;
}): Promise<{ reply: string | null; error: string | null }> {
  let lastError = 'Chat request failed';
  let truncatedReply: string | null = null;

  for (const model of GEMINI_MODELS) {
    const contents: Array<Record<string, unknown>> = [
      { role: 'user', parts: [{ text: opts.message }] },
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const attempts: Array<{ maxOutputTokens: number; thinkingBudget?: number }> = [
        { maxOutputTokens: 1024, thinkingBudget: 0 },
        { maxOutputTokens: 2048 },
      ];

      let raw = '';
      let resOk = false;
      let data: GeminiGenerateResponse | null = null;

      for (const attempt of attempts) {
        const generationConfig: Record<string, unknown> = {
          temperature: 0.7,
          maxOutputTokens: attempt.maxOutputTokens,
        };
        if (attempt.thinkingBudget !== undefined) {
          generationConfig.thinkingConfig = { thinkingBudget: attempt.thinkingBudget };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': opts.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents,
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
            toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
            generationConfig,
          }),
        });

        raw = await res.text().catch(() => '');
        if (!res.ok) {
          console.error('Gemini chat failed:', model, res.status, raw.slice(0, 400));
          lastError = mapGeminiError(raw, res.status);
          if (res.status === 400 && /thinking|INVALID_ARGUMENT/i.test(raw)) continue;
          if (
            res.status === 404 ||
            res.status === 429 ||
            /not found|not supported|no longer available|limit:\s*0/i.test(raw)
          ) {
            break;
          }
          return { reply: null, error: lastError };
        }

        try {
          data = JSON.parse(raw) as GeminiGenerateResponse;
          resOk = true;
          break;
        } catch {
          lastError = 'Chat response parse failed';
          continue;
        }
      }

      if (!resOk || !data) {
        if (/not found|no longer available|limit:\s*0|429/.test(lastError) || lastError.includes('quota')) {
          break; // next model
        }
        continue;
      }

      if (data.promptFeedback?.blockReason) {
        return { reply: null, error: 'Message was blocked by safety filters — try rephrasing.' };
      }

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const functionCalls = parts.filter((p) => p.functionCall?.name);

      if (functionCalls.length > 0) {
        contents.push({ role: 'model', parts });
        const responseParts: Array<Record<string, unknown>> = [];
        for (const part of functionCalls) {
          const name = part.functionCall!.name!;
          const args = (part.functionCall!.args ?? {}) as Record<string, unknown>;
          const result = await executeTool(name, args, opts.toolCtx);
          responseParts.push({
            functionResponse: {
              name,
              response: result,
            },
          });
        }
        contents.push({ role: 'user', parts: responseParts });

        if (round < MAX_TOOL_ROUNDS) continue;

        // Final forced answer after last tool round (no more tools)
        const finalUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const finalRes = await fetch(finalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': opts.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents: [
              ...contents,
              {
                role: 'user',
                parts: [
                  {
                    text: 'Answer the user now using the tool results. Do not call tools.',
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });
        const finalRaw = await finalRes.text().catch(() => '');
        if (finalRes.ok) {
          try {
            const finalData = JSON.parse(finalRaw) as GeminiGenerateResponse;
            const finalText = finalData.candidates?.[0]?.content?.parts
              ?.map((p) => p.text ?? '')
              .join('')
              .trim();
            if (finalText) return { reply: finalText, error: null };
          } catch {
            /* fall through */
          }
        }
        lastError = 'Empty reply from model';
        break;
      }

      const text = parts
        .map((p) => p.text ?? '')
        .join('')
        .trim();
      if (text) {
        if (candidate?.finishReason === 'MAX_TOKENS') {
          truncatedReply = text;
          break;
        }
        return { reply: text, error: null };
      }

      lastError = 'Empty reply from model';
      break;
    }

    if (truncatedReply) return { reply: truncatedReply, error: null };
  }

  if (truncatedReply) return { reply: truncatedReply, error: null };
  return { reply: null, error: lastError };
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCtx
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case 'get_dashboard':
        return await toolGetDashboard(ctx);
      case 'update_dashboard':
        return await toolUpdateDashboard(ctx, args.patch);
      case 'list_cvs':
        return await toolListCvs(ctx);
      case 'get_cv':
        return await toolGetCv(ctx, String(args.id ?? ''));
      case 'update_cv':
        return await toolUpdateCv(ctx, args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    console.error('tool failed', name, e);
    return { error: e instanceof Error ? e.message : 'Tool failed' };
  }
}

async function toolGetDashboard(ctx: ToolCtx) {
  const [{ data: dash, error }, { data: inv }] = await Promise.all([
    ctx.supabase.from('life_dashboard_state').select('payload, layout, updated_at').eq('key', 'default').maybeSingle(),
    ctx.supabase.from('life_investments').select('symbol, name, holdings, invested, exchange').limit(10),
  ]);
  if (error) return { error: error.message };
  return {
    payload: dash?.payload ?? {},
    updated_at: dash?.updated_at ?? null,
    investments: inv ?? [],
  };
}

async function toolUpdateDashboard(ctx: ToolCtx, patchUnknown: unknown) {
  if (!patchUnknown || typeof patchUnknown !== 'object' || Array.isArray(patchUnknown)) {
    return { error: 'patch must be an object' };
  }
  const patch = patchUnknown as Record<string, unknown>;
  const { data: existing, error: fetchErr } = await ctx.supabase
    .from('life_dashboard_state')
    .select('payload, layout')
    .eq('key', 'default')
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };

  const current =
    existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
      ? (existing.payload as Record<string, unknown>)
      : {};
  const nextPayload = deepMerge(current, patch);

  const { data, error } = await ctx.supabase
    .from('life_dashboard_state')
    .upsert(
      {
        key: 'default',
        payload: nextPayload,
        layout: existing?.layout ?? {},
      },
      { onConflict: 'key' }
    )
    .select('payload, updated_at')
    .single();
  if (error) return { error: error.message };
  ctx.didMutate = true;
  return { ok: true, updated_at: data.updated_at, payload: data.payload };
}

async function toolListCvs(ctx: ToolCtx) {
  const { data, error } = await ctx.supabase
    .from('cv_documents')
    .select('id, title, notes, is_active, mime_type, size, extracted_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return {
    cvs: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      notes: row.notes,
      is_active: row.is_active,
      mime_type: row.mime_type,
      size: row.size,
      has_text: Boolean(row.extracted_at),
      created_at: row.created_at,
    })),
  };
}

async function toolGetCv(ctx: ToolCtx, id: string) {
  if (!id) return { error: 'id required' };
  let { data: row, error } = await ctx.supabase
    .from('cv_documents')
    .select('id, title, notes, is_active, mime_type, file_name, file_path, size, extracted_text, extracted_at')
    .eq('id', id)
    .single();
  if (error) return { error: error.message };

  if (!row.extracted_text) {
    try {
      const extracted = await extractAndStoreCvText(ctx.supabase, row);
      row = { ...row, extracted_text: extracted.extracted_text, extracted_at: extracted.extracted_at };
    } catch (e) {
      return {
        id: row.id,
        title: row.title,
        notes: row.notes,
        is_active: row.is_active,
        mime_type: row.mime_type,
        file_name: row.file_name,
        size: row.size,
        extracted_text: '',
        extract_error: e instanceof Error ? e.message : 'Extract failed',
      };
    }
  }

  let text = typeof row.extracted_text === 'string' ? row.extracted_text : '';
  if (text.length > CV_TEXT_CHAT_CAP) {
    text = text.slice(0, CV_TEXT_CHAT_CAP) + '\n\n[…truncated for chat…]';
  }

  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    is_active: row.is_active,
    mime_type: row.mime_type,
    file_name: row.file_name,
    size: row.size,
    extracted_at: row.extracted_at,
    extracted_text: text,
  };
}

async function toolUpdateCv(ctx: ToolCtx, args: Record<string, unknown>) {
  const id = String(args.id ?? '');
  if (!id) return { error: 'id required' };
  const row: Record<string, unknown> = {};
  if (typeof args.title === 'string') row.title = args.title.trim();
  if (typeof args.notes === 'string') row.notes = args.notes;
  if (typeof args.is_active === 'boolean') row.is_active = args.is_active;
  if (Object.keys(row).length === 0) return { error: 'No updatable fields provided' };

  const { data, error } = await ctx.supabase
    .from('cv_documents')
    .update(row)
    .eq('id', id)
    .select('id, title, notes, is_active, updated_at')
    .single();
  if (error) return { error: error.message };
  ctx.didMutate = true;
  return { ok: true, cv: data };
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
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
    if (/limit:\s*0/i.test(msg)) {
      return 'This Gemini model has no free quota on your account — Ei will try another model.';
    }
    if (/quota|rate|RESOURCE_EXHAUSTED/i.test(msg) || status === 429) {
      return 'Gemini free quota hit — wait a bit and try again.';
    }
    if (msg) return `Chat failed: ${msg.slice(0, 160)}`;
  } catch {
    /* ignore */
  }
  if (status === 429) return 'Gemini free quota hit — wait a bit and try again.';
  return 'Chat request failed';
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
