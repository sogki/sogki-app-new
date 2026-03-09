// Supabase Edge Function: Admin API
// Verifies admin JWT, uses service role for all DB operations
// Handles: graphics, blogs, projects, social, footer

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', ['ADMIN_DISCORD_USER_ID', 'ADMIN_JWT_SECRET']);

  const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];

  if (!allowedUserId || !jwtSecret) {
    return json({ error: 'Config error' }, 500);
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub as string;
    if (sub !== allowedUserId) {
      return json({ error: 'Unauthorized' }, 401);
    }
  } catch {
    return json({ error: 'Invalid token' }, 401);
  }

  const url = new URL(req.url);
  const match = url.pathname.match(/\/admin-api(?:\/(.*))?$/);
  const path = (match?.[1] ?? '').replace(/^\/+/, '');
  const parts = path ? path.split('/').filter(Boolean) : [];

  try {
    if (req.method === 'GET') {
      return await handleGet(supabase, parts, url);
    }
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      const body = req.method !== 'DELETE' ? await req.json().catch(() => ({})) : {};
      return await handleMutate(supabase, req.method, parts, body);
    }
  } catch (err) {
    return json({ error: String(err) }, 500);
  }

  return json({ error: 'Not found' }, 404);
});

async function handleGet(supabase: any, parts: string[], url: URL) {
  const [resource, id] = parts;

  switch (resource) {
    case 'collections':
      const { data: cols } = await supabase.from('graphics_design_collections').select('*').order('sort_order');
      return json(cols ?? []);
    case 'assets':
      const collectionId = url.searchParams.get('collection_id');
      let q = supabase.from('graphics_design_assets').select('*');
      if (collectionId) q = q.eq('collection_id', collectionId);
      const { data: assets } = await q.order('sort_order');
      return json(assets ?? []);
    case 'blogs':
      if (id) {
        const { data } = await supabase.from('blogs').select('*').eq('id', id).single();
        return json(data ?? {});
      }
      const { data: blogs } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      return json(blogs ?? []);
    case 'projects':
      const { data: projects } = await supabase.from('projects').select('*').order('sort_order');
      return json(projects ?? []);
    case 'social':
      const { data: social } = await supabase.from('social_links').select('*').order('sort_order');
      return json(social ?? []);
    case 'footer':
      const { data: footer } = await supabase.from('footer_config').select('*');
      const config = Object.fromEntries((footer ?? []).map((r: any) => [r.key, r.value]));
      return json(config);
    default:
      return json({ error: 'Unknown resource' }, 404);
  }
}

async function handleMutate(supabase: any, method: string, parts: string[], body: any) {
  const [resource, id] = parts;

  const tableMap: Record<string, string> = {
    collections: 'graphics_design_collections',
    assets: 'graphics_design_assets',
    blogs: 'blogs',
    projects: 'projects',
    social: 'social_links',
    footer: 'footer_config',
  };

  const table = tableMap[resource];
  if (!table) return json({ error: 'Unknown resource' }, 404);

  if (method === 'POST' && !id) {
    const { data, error } = await supabase.from(table).insert(body).select().single();
    if (error) throw error;
    return json(data);
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!id) return json({ error: 'ID required' }, 400);
    const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
    if (error) throw error;
    return json(data);
  }

  if (method === 'DELETE') {
    if (!id) return json({ error: 'ID required' }, 400);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return json({ ok: true });
  }

  if (resource === 'footer' && method === 'POST') {
    const { key, value } = body;
    if (!key) return json({ error: 'key required' }, 400);
    const { data, error } = await supabase.from(table).upsert({ key, value }, { onConflict: 'key' }).select().single();
    if (error) throw error;
    return json(data);
  }

  return json({ error: 'Method not allowed' }, 405);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
