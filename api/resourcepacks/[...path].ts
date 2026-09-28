import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../src/config/bootstrap';

export const config = {
  runtime: 'edge',
};

const FLAG_KEY = 'resourcepacks_api_enabled';

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const segment = packSegment(new URL(request.url).pathname);
  if (!segment) {
    return json({ error: 'Resource pack API is disabled' }, 404);
  }

  const enabled = await publicApiEnabled();
  if (!enabled) {
    return json({ error: 'Resource pack API is disabled' }, 404);
  }

  const target = new URL(`${SUPABASE_URL}/functions/v1/resourcepacks-api/${segment}`);
  const upstream = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: request.headers.get('Accept') ?? '*/*',
    },
    redirect: 'manual',
  });

  const headers = new Headers();
  for (const name of [
    'content-type',
    'cache-control',
    'location',
    'content-disposition',
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods',
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('access-control-allow-origin')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  if (request.method === 'HEAD' || upstream.status === 302) {
    return new Response(null, { status: upstream.status, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

function packSegment(pathname: string): string | null {
  const segment = pathname.replace(/^\/api\/resourcepacks\/?/, '').split('/').filter(Boolean)[0] ?? '';
  if (segment === 'active') return segment;
  if (/^[0-9a-fA-F-]{36}$/.test(segment)) return segment;
  return null;
}

async function publicApiEnabled(): Promise<boolean> {
  const url =
    `${SUPABASE_URL}/rest/v1/keys` +
    `?key=eq.${FLAG_KEY}&is_public=eq.true&select=value&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ value?: string }>;
    return rows[0]?.value === 'true';
  } catch {
    return false;
  }
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  };
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
