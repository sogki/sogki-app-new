import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || 'VUAG.L').toUpperCase();
    const range = url.searchParams.get('range') || '1mo';
    const interval = url.searchParams.get('interval') || '1d';

    const yahooUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false`;

    const yahooRes = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    });

    if (!yahooRes.ok) {
      return json({ error: `Yahoo Finance error (${yahooRes.status})` }, 502);
    }

    const payload = await yahooRes.json();
    const result = payload?.chart?.result?.[0];
    if (!result) return json({ error: 'No quote data returned for symbol' }, 404);

    const meta = result.meta ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const closes: Array<number | null> =
      result.indicators?.quote?.[0]?.close ?? [];

    const series = timestamps
      .map((ts, i) => {
        const value = closes[i];
        if (value == null || !Number.isFinite(value)) return null;
        return {
          t: new Date(ts * 1000).toISOString(),
          value: Number(value),
        };
      })
      .filter(Boolean);

    const price =
      Number(meta.regularMarketPrice) ||
      (series.length ? (series[series.length - 1] as { value: number }).value : 0);
    const previousClose = Number(meta.chartPreviousClose || meta.previousClose) || price;
    const dailyChangePct = previousClose
      ? ((price - previousClose) / previousClose) * 100
      : 0;

    return json({
      symbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || symbol,
      currency: meta.currency || 'GBP',
      price,
      previousClose,
      dailyChangePct,
      marketState: meta.marketState || null,
      series,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Quote failed' }, 500);
  }
});

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { ok: false as const, error: 'Unauthorized', status: 401 };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', ['ADMIN_DISCORD_USER_ID', 'ADMIN_JWT_SECRET', 'ADMIN_DEV_TOKEN']);

  const keyMap = Object.fromEntries((keys ?? []).map((row) => [row.key, row.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];
  const devToken = keyMap['ADMIN_DEV_TOKEN'];

  const origin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
  const validDevToken = devToken && devToken.length >= 32 && devToken !== 'REPLACE_ME';
  if (isLocalhost && validDevToken && token === devToken) {
    return { ok: true as const };
  }

  if (!allowedUserId || !jwtSecret) {
    return { ok: false as const, error: 'Config error', status: 500 };
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    if ((payload.sub as string) !== allowedUserId) {
      return { ok: false as const, error: 'Unauthorized', status: 401 };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'Invalid token', status: 401 };
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
