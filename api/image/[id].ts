export const config = {
  runtime: 'edge',
};

const ALLOWED_HOST_SUFFIXES = [
  '.supabase.co',
  'supabase.co',
];

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isAllowedImageUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(suffix)
  );
  return allowed ? parsed : null;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { pathname } = new URL(request.url);
  const id = pathname.replace(/^\/api\/image\//, '').replace(/\/$/, '');
  if (!id) {
    return new Response('Missing image id', { status: 400 });
  }

  let rawUrl: string;
  try {
    rawUrl = fromBase64Url(id);
  } catch {
    return new Response('Invalid image id', { status: 400 });
  }

  const parsed = isAllowedImageUrl(rawUrl);
  if (!parsed) {
    return new Response('URL not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: 'image/*,video/*,*/*' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status === 404 ? 404 : 502,
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    });

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response('Proxy failed', { status: 502 });
  }
}
