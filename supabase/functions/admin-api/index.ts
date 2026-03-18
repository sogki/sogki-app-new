// Supabase Edge Function: Admin API
// Verifies admin JWT, uses service role for all DB operations
// Handles: graphics, blogs, projects, social, footer, resource packs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';
import { createHash } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const BUCKET_BLOG_IMAGES = 'blog-images';
const BUCKET_RESOURCEPACKS = 'resourcepacks';

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
    .in('key', ['ADMIN_DISCORD_USER_ID', 'ADMIN_JWT_SECRET', 'ADMIN_DEV_TOKEN']);

  const keyMap = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];
  const devToken = keyMap['ADMIN_DEV_TOKEN'];

  if (!allowedUserId || !jwtSecret) {
    return json({ error: 'Config error' }, 500);
  }

  // Localhost dev bypass: when request is from localhost and ADMIN_DEV_TOKEN matches, skip Discord JWT
  const origin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
  const validDevToken = devToken && devToken.length >= 32 && devToken !== 'REPLACE_ME';
  if (isLocalhost && validDevToken && token === devToken) {
    // Dev token valid - allow access (still restricted to localhost)
  } else {
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
      // Blog image upload: POST blogs/upload
      if (parts[0] === 'blogs' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleBlogImageUpload(supabase, body);
      }
      // Resource pack upload: POST resourcepacks/upload
      if (parts[0] === 'resourcepacks' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleResourcePackUpload(supabase, body);
      }
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
    case 'site_content':
      const section = url.searchParams.get('section');
      let scQ = supabase.from('site_content').select('*').order('sort_order');
      if (section) scQ = scQ.eq('section', section);
      const { data: siteContent } = await scQ;
      return json(siteContent ?? []);
    case 'resourcepacks':
      const { data: packs } = await supabase
        .from('resource_packs')
        .select('*')
        .order('created_at', { ascending: false });
      return json(packs ?? []);
    default:
      return json({ error: 'Unknown resource' }, 404);
  }
}

async function handleBlogImageUpload(supabase: any, body: any) {
  const { file, filename, blog_id, alt } = body;
  if (!file || !filename) return json({ error: 'file and filename required' }, 400);
  const base64 = typeof file === 'string' ? file.replace(/^data:image\/\w+;base64,/, '') : null;
  if (!base64) return json({ error: 'Invalid file data' }, 400);
  const ext = filename.split('.').pop() || 'png';
  const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext.toLowerCase()) ? ext : 'png';
  const path = `${blog_id || 'drafts'}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  const buf = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_BLOG_IMAGES)
    .upload(path, buf, { contentType: `image/${safeExt}`, upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 400);
  const { data: urlData } = supabase.storage.from(BUCKET_BLOG_IMAGES).getPublicUrl(upload.path);
  const publicUrl = urlData.publicUrl;
  if (blog_id) {
    await supabase.from('blog_images').insert({
      blog_id,
      storage_path: upload.path,
      public_url: publicUrl,
      alt_text: alt || null,
      sort_order: 0,
    });
  }
  return json({ url: publicUrl, path: upload.path });
}

async function handleResourcePackUpload(supabase: any, body: any) {
  const { file, filename, name, version, is_active, auto_deactivate_previous, group_key } = body ?? {};
  if (!file || !filename || !name || !version) {
    return json({ error: 'file, filename, name, and version are required' }, 400);
  }
  if (!filename.toLowerCase().endsWith('.zip')) {
    return json({ error: 'Only .zip files are allowed' }, 400);
  }

  const base64 = typeof file === 'string' ? file.replace(/^data:.*;base64,/, '') : null;
  if (!base64) return json({ error: 'Invalid file data' }, 400);

  const buf = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const sha1 = await sha1Hex(buf);
  const size = buf.byteLength;

  const safeName = slugify(String(name));
  const safeVersion = slugify(String(version));
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${safeName}/${safeVersion}/${Date.now()}-${safeFile}`;

  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_RESOURCEPACKS)
    .upload(path, buf, {
      contentType: 'application/zip',
      cacheControl: '31536000',
      upsert: false,
    });
  if (uploadErr) return json({ error: uploadErr.message }, 400);

  if (auto_deactivate_previous && group_key && Boolean(is_active ?? true)) {
    await supabase
      .from('resource_packs')
      .update({ is_active: false })
      .eq('name', group_key)
      .eq('is_active', true);
  }

  const row = {
    name: String(name),
    file_name: filename,
    file_path: upload.path,
    version: String(version),
    sha1,
    size,
    is_active: Boolean(is_active ?? true),
  };

  const { data, error } = await supabase.from('resource_packs').insert(row).select('*').single();
  if (error) {
    await supabase.storage.from(BUCKET_RESOURCEPACKS).remove([upload.path]);
    return json({ error: error.message }, 400);
  }

  return json(data);
}

async function handleMutate(supabase: any, method: string, parts: string[], body: any) {
  const [resource, id] = parts;

  if (resource === 'resourcepacks') {
    if (method === 'PATCH' || method === 'PUT') {
      if (!id) return json({ error: 'ID required' }, 400);
      const payload: Record<string, unknown> = {};
      if (body.name != null) payload.name = body.name;
      if (body.version != null) payload.version = body.version;
      if (body.is_active != null) payload.is_active = Boolean(body.is_active);
      const { data, error } = await supabase
        .from('resource_packs')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return json(data);
    }

    if (method === 'DELETE') {
      if (!id) return json({ error: 'ID required' }, 400);
      const { data: existing, error: fetchErr } = await supabase
        .from('resource_packs')
        .select('id, file_path')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error: storageErr } = await supabase.storage.from(BUCKET_RESOURCEPACKS).remove([existing.file_path]);
      if (storageErr) throw storageErr;

      const { error } = await supabase.from('resource_packs').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  const tableMap: Record<string, string> = {
    collections: 'graphics_design_collections',
    assets: 'graphics_design_assets',
    blogs: 'blogs',
    projects: 'projects',
    social: 'social_links',
    footer: 'footer_config',
    site_content: 'site_content',
  };

  const table = tableMap[resource];
  if (!table) return json({ error: 'Unknown resource' }, 404);

  // Site content: key-value upsert
  if (resource === 'site_content' && method === 'POST') {
    const { key, value, content_type, section, label } = body;
    if (!key) return json({ error: 'key required' }, 400);
    const row: Record<string, unknown> = { key, value };
    if (content_type != null) row.content_type = content_type;
    if (section != null) row.section = section;
    if (label != null) row.label = label;
    const { data, error } = await supabase.from(table).upsert(row, { onConflict: 'key' }).select().single();
    if (error) throw error;
    return json(data);
  }

  // Footer uses key-value upsert
  if (resource === 'footer' && method === 'POST') {
    const { key, value } = body;
    if (!key) return json({ error: 'key required' }, 400);
    const { data, error } = await supabase.from(table).upsert({ key, value }, { onConflict: 'key' }).select().single();
    if (error) throw error;
    return json(data);
  }

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

  return json({ error: 'Method not allowed' }, 405);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pack';
}

async function sha1Hex(buf: Uint8Array) {
  return createHash('sha1').update(buf).digest('hex');
}
