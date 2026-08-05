// Supabase Edge Function: Discord OAuth callback
// Redirect URI: https://[PROJECT_REF].supabase.co/functions/v1/auth-discord-callback
// Only allows ADMIN_DISCORD_USER_ID to authenticate

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: keys, error: keysError } = await supabase
      .from('keys')
      .select('key, value')
      .in('key', [
        'ADMIN_DISCORD_USER_ID',
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'ADMIN_JWT_SECRET',
        'ADMIN_SITE_URL',
      ]);

    if (keysError) {
      return jsonError(`keys: ${keysError.message}`, 500);
    }

    const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
    const siteUrl = resolveSiteUrl(keyMap['ADMIN_SITE_URL'], req, url);

    if (error) {
      return Response.redirect(`${siteUrl}/admin?error=${encodeURIComponent(error)}`, 302);
    }

    if (!code) {
      return Response.redirect(`${siteUrl}/admin?error=no_code`, 302);
    }

    const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
    const clientId = keyMap['DISCORD_CLIENT_ID'];
    const clientSecret = keyMap['DISCORD_CLIENT_SECRET'];
    const jwtSecret = keyMap['ADMIN_JWT_SECRET'];

    if (!allowedUserId || !clientId || !clientSecret || !jwtSecret) {
      return Response.redirect(`${siteUrl}/admin?error=config`, 302);
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/auth-discord-callback`;

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.redirect(
        `${siteUrl}/admin?error=token&msg=${encodeURIComponent(err.slice(0, 50))}`,
        302
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return Response.redirect(`${siteUrl}/admin?error=user`, 302);
    }

    const user = await userRes.json();
    const discordUserId = user.id;

    if (discordUserId !== allowedUserId) {
      return Response.redirect(`${siteUrl}/admin?error=unauthorized`, 302);
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const jwt = await new jose.SignJWT({ sub: discordUserId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime('7d')
      .sign(secret);

    const redirectUrl = buildRedirectUrl(jwt, state, siteUrl);
    return redirectResponse(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(message, 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function redirectResponse(target: string): Response {
  // Prefer a raw Location header. ASWebAuthenticationSession / Expo WebBrowser
  // intercept matching callback URLs from redirects — they often won't run JS HTML bridges.
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      'Cache-Control': 'no-store',
    },
  });
}

function resolveSiteUrl(
  configuredRaw: string | undefined,
  req: Request,
  url: URL
): string {
  const configured = normalizeAbsoluteUrl(configuredRaw);
  if (configured) return configured;

  const originHeader = req.headers.get('origin');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = req.headers.get('host');

  const candidates = [
    normalizeAbsoluteUrl(originHeader),
    normalizeFromHost(forwardedHost, forwardedProto),
    normalizeFromHost(host, forwardedProto),
    normalizeFromHost(url.host, url.protocol.replace(':', '')),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return 'http://localhost:5173';
}

function normalizeAbsoluteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function normalizeFromHost(hostValue: string | null, protoValue: string | null): string | null {
  if (!hostValue) return null;
  const hostClean = hostValue.trim();
  if (!hostClean) return null;
  const proto = (protoValue || '').toLowerCase() === 'http' ? 'http' : 'https';
  return normalizeAbsoluteUrl(`${proto}://${hostClean}`);
}

/** Supports mobile return URLs via OAuth state:
 * - Custom schemes: eimobile://auth
 * - Expo Go proxy: https://auth.expo.dev/@sogki/ei/...
 */
function buildRedirectUrl(jwt: string, rawState: string | null, siteUrl: string): string {
  const state = rawState?.trim() ?? '';
  const isExpoAuthProxy =
    /^https:\/\/auth\.expo\.(dev|io)\//i.test(state);
  const isCustomScheme =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(state) && !/^https?:\/\//i.test(state);

  if (state && (isExpoAuthProxy || isCustomScheme)) {
    const separator = state.includes('?') ? '&' : '?';
    return `${state}${separator}token=${encodeURIComponent(jwt)}`;
  }

  const adminPath = normalizeAdminPath(rawState);
  return `${siteUrl}${adminPath}?token=${jwt}`;
}

function normalizeAdminPath(rawState: string | null): string {
  if (!rawState || !rawState.trim()) return '/admin';
  let statePath = rawState.trim();
  if (
    statePath.startsWith('http://') ||
    statePath.startsWith('https://') ||
    statePath.includes('://')
  ) {
    return '/admin';
  }
  if (!statePath.startsWith('/')) statePath = `/${statePath}`;
  if (!statePath.startsWith('/admin')) statePath = `/admin${statePath}`;
  return statePath;
}
