// Supabase Edge Function: Discord OAuth callback
// Redirect URI: https://[PROJECT_REF].supabase.co/functions/v1/auth-discord-callback
// Only allows ADMIN_DISCORD_USER_ID to authenticate

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // optional: redirect path
  const error = url.searchParams.get('error');

  if (error) {
    const redirectUrl = `${getSiteUrl()}/admin?error=${encodeURIComponent(error)}`;
    return Response.redirect(redirectUrl, 302);
  }

  if (!code) {
    return Response.redirect(`${getSiteUrl()}/admin?error=no_code`, 302);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', [
      'ADMIN_DISCORD_USER_ID',
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
      'ADMIN_JWT_SECRET',
      'ADMIN_SITE_URL',
    ]);

  const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const clientId = keyMap['DISCORD_CLIENT_ID'];
  const clientSecret = keyMap['DISCORD_CLIENT_SECRET'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];

  if (!allowedUserId || !clientId || !clientSecret || !jwtSecret) {
    return Response.redirect(`${getSiteUrl()}/admin?error=config`, 302);
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
    return Response.redirect(`${getSiteUrl()}/admin?error=token&msg=${encodeURIComponent(err.slice(0, 50))}`, 302);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    return Response.redirect(`${getSiteUrl()}/admin?error=user`, 302);
  }

  const user = await userRes.json();
  const discordUserId = user.id;

  if (discordUserId !== allowedUserId) {
    return Response.redirect(`${getSiteUrl()}/admin?error=unauthorized`, 302);
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const jwt = await new jose.SignJWT({ sub: discordUserId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime('7d')
    .sign(secret);

  const adminPath = state ? `/admin${state}` : '/admin';
  const redirectUrl = `${getSiteUrl()}${adminPath}?token=${jwt}`;
  return Response.redirect(redirectUrl, 302);

  function getSiteUrl() {
    return (keyMap['ADMIN_SITE_URL'] || 'http://localhost:5173').replace(/\/$/, '');
  }
});
