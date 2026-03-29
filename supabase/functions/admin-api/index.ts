// Supabase Edge Function: Admin API
// Verifies admin JWT, uses service role for all DB operations
// Handles: graphics, blogs, projects, social, footer, resource packs, binder showcases

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
const MAX_BLOG_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BINDER_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RESOURCEPACK_BYTES = 200 * 1024 * 1024; // 200 MB

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
      // Blog image upload: POST blogs/upload
      if (parts[0] === 'blogs' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleBlogImageUpload(supabase, req);
      }
      // Resource pack upload: POST resourcepacks/upload
      if (parts[0] === 'resourcepacks' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleResourcePackUpload(supabase, req);
      }
      if (parts[0] === 'binder_showcases' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleBinderShowcaseImageUpload(supabase, req);
      }
      const body = req.method !== 'DELETE' ? await req.json().catch(() => ({})) : {};
      return await handleMutate(supabase, req.method, parts, body);
    }
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
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
    case 'binder_showcases': {
      const { data: binders, error: bindersErr } = await supabase
        .from('binder_showcases')
        .select(
          `
          *,
          binder_showcase_images ( id, showcase_id, public_url, storage_path, sort_order ),
          binder_showcase_sets ( id, showcase_id, name, name_jp, description, completed, total, sort_order )
        `
        )
        .order('sort_order', { ascending: true });
      if (bindersErr) throw bindersErr;
      const rows = (binders ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        binder_showcase_images: [...((row.binder_showcase_images as unknown[]) ?? [])].sort(
          (a: { sort_order?: number }, b: { sort_order?: number }) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        ),
        binder_showcase_sets: [...((row.binder_showcase_sets as unknown[]) ?? [])].sort(
          (a: { sort_order?: number }, b: { sort_order?: number }) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        ),
      }));
      return json(rows);
    }
    default:
      return json({ error: 'Unknown resource' }, 404);
  }
}

async function handleBlogImageUpload(supabase: any, req: Request) {
  const parsed = await parseUploadRequest(req);
  const { fileBytes, filename, blogId, alt, mimeType } = parsed;
  if (!fileBytes || !filename) return json({ error: 'file and filename required' }, 400);
  if (fileBytes.byteLength > MAX_BLOG_IMAGE_BYTES) {
    return json({ error: 'Image too large. Max size is 10 MB.' }, 413);
  }
  const ext = filename.split('.').pop() || 'png';
  const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext.toLowerCase()) ? ext : 'png';
  const path = `${blogId || 'drafts'}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  const contentType = mimeType && mimeType.startsWith('image/') ? mimeType : `image/${safeExt}`;
  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_BLOG_IMAGES)
    .upload(path, fileBytes, { contentType, upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 400);
  const { data: urlData } = supabase.storage.from(BUCKET_BLOG_IMAGES).getPublicUrl(upload.path);
  const publicUrl = urlData.publicUrl;
  if (blogId) {
    await supabase.from('blog_images').insert({
      blog_id: blogId,
      storage_path: upload.path,
      public_url: publicUrl,
      alt_text: alt,
      sort_order: 0,
    });
  }
  return json({ url: publicUrl, path: upload.path });
}

async function handleResourcePackUpload(supabase: any, req: Request) {
  const parsed = await parseUploadRequest(req);
  const { fileBytes, filename, name, version, description, isActive, autoDeactivatePrevious, groupKey } = parsed;
  if (!fileBytes || !filename || !name || !version) {
    return json({ error: 'file, filename, name, and version are required' }, 400);
  }
  if (fileBytes.byteLength > MAX_RESOURCEPACK_BYTES) {
    return json({ error: 'Resource pack too large. Max size is 200 MB.' }, 413);
  }
  if (!filename.toLowerCase().endsWith('.zip')) {
    return json({ error: 'Only .zip files are allowed' }, 400);
  }

  const sha1 = await sha1Hex(fileBytes);
  const size = fileBytes.byteLength;

  const safeName = slugify(name);
  const safeVersion = slugify(version);
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${safeName}/${safeVersion}/${Date.now()}-${safeFile}`;

  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_RESOURCEPACKS)
    .upload(path, fileBytes, {
      contentType: 'application/zip',
      cacheControl: '31536000',
      upsert: false,
    });
  if (uploadErr) return json({ error: uploadErr.message }, 400);

  if (autoDeactivatePrevious && groupKey && isActive) {
    await supabase
      .from('resource_packs')
      .update({ is_active: false })
      .eq('name', groupKey)
      .eq('is_active', true);
  }

  const row = {
    name,
    file_name: filename,
    file_path: upload.path,
    version,
    description: description ?? null,
    sha1,
    size,
    is_active: isActive,
  };

  const { data, error } = await supabase.from('resource_packs').insert(row).select('*').single();
  if (error) {
    await supabase.storage.from(BUCKET_RESOURCEPACKS).remove([upload.path]);
    return json({ error: error.message }, 400);
  }

  return json(data);
}

async function handleBinderShowcaseImageUpload(supabase: any, req: Request) {
  const parsed = await parseUploadRequest(req);
  const { fileBytes, filename, mimeType } = parsed;
  if (!fileBytes || !filename) return json({ error: 'file and filename required' }, 400);
  if (fileBytes.byteLength > MAX_BINDER_IMAGE_BYTES) {
    return json({ error: 'Image too large. Max size is 10 MB.' }, 413);
  }
  const ext = filename.split('.').pop() || 'png';
  const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext.toLowerCase()) ? ext : 'png';
  const path = `binder-showcase/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  const contentType = mimeType && mimeType.startsWith('image/') ? mimeType : `image/${safeExt}`;
  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_BLOG_IMAGES)
    .upload(path, fileBytes, { contentType, upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 400);
  const { data: urlData } = supabase.storage.from(BUCKET_BLOG_IMAGES).getPublicUrl(upload.path);
  return json({ url: urlData.publicUrl, path: upload.path });
}

async function parseUploadRequest(req: Request) {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('multipart/form-data')) {
    const form = await req.formData();
    const fileField = form.get('file');
    if (!(fileField instanceof File)) {
      return {
        fileBytes: null as Uint8Array | null,
        filename: '',
        mimeType: '',
        name: '',
        version: '',
        description: null as string | null,
        isActive: true,
        autoDeactivatePrevious: false,
        groupKey: '',
        blogId: null as string | null,
        alt: null as string | null,
      };
    }
    const buffer = new Uint8Array(await fileField.arrayBuffer());
    return {
      fileBytes: buffer,
      filename: fileField.name || String(form.get('filename') ?? ''),
      mimeType: fileField.type || '',
      name: String(form.get('name') ?? ''),
      version: String(form.get('version') ?? ''),
      description: nullableText(form.get('description')),
      isActive: parseBoolean(form.get('is_active'), true),
      autoDeactivatePrevious: parseBoolean(form.get('auto_deactivate_previous'), false),
      groupKey: String(form.get('group_key') ?? ''),
      blogId: nullableText(form.get('blog_id')),
      alt: nullableText(form.get('alt')),
    };
  }

  // Backward-compatible fallback for older clients still sending base64 JSON.
  const body = await req.json().catch(() => ({} as any));
  const file = body?.file;
  const base64 = typeof file === 'string' ? file.replace(/^data:.*;base64,/, '') : null;
  const fileBytes = base64 ? decodeBase64(base64) : null;
  return {
    fileBytes,
    filename: String(body?.filename ?? ''),
    mimeType: '',
    name: String(body?.name ?? ''),
    version: String(body?.version ?? ''),
    description: body?.description == null ? null : String(body.description),
    isActive: Boolean(body?.is_active ?? true),
    autoDeactivatePrevious: Boolean(body?.auto_deactivate_previous ?? false),
    groupKey: String(body?.group_key ?? ''),
    blogId: body?.blog_id == null ? null : String(body.blog_id),
    alt: body?.alt == null ? null : String(body.alt),
  };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function parseBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
  }
  return fallback;
}

function nullableText(value: FormDataEntryValue | null) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

async function handleMutate(supabase: any, method: string, parts: string[], body: any) {
  const [resource, id] = parts;

  if (resource === 'resourcepacks') {
    if (method === 'PATCH' || method === 'PUT') {
      if (!id) return json({ error: 'ID required' }, 400);
      const payload: Record<string, unknown> = {};
      if (body.name != null) payload.name = body.name;
      if (body.version != null) payload.version = body.version;
      if (Object.prototype.hasOwnProperty.call(body, 'description')) payload.description = body.description;
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

  if (resource === 'binder_showcases' && method === 'DELETE' && id) {
    const { data: imgs } = await supabase
      .from('binder_showcase_images')
      .select('storage_path')
      .eq('showcase_id', id);
    const paths = (imgs ?? []).map((r: { storage_path: string | null }) => r.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: storageErr } = await supabase.storage.from(BUCKET_BLOG_IMAGES).remove(paths as string[]);
      if (storageErr) throw storageErr;
    }
    const { error: delErr } = await supabase.from('binder_showcases').delete().eq('id', id);
    if (delErr) throw delErr;
    return json({ ok: true });
  }

  if (resource === 'binder_showcase_images' && method === 'DELETE' && id) {
    const { data: row } = await supabase.from('binder_showcase_images').select('storage_path').eq('id', id).single();
    if (row?.storage_path) {
      const { error: storageErr } = await supabase.storage.from(BUCKET_BLOG_IMAGES).remove([row.storage_path]);
      if (storageErr) throw storageErr;
    }
    const { error: delImgErr } = await supabase.from('binder_showcase_images').delete().eq('id', id);
    if (delImgErr) throw delImgErr;
    return json({ ok: true });
  }

  const tableMap: Record<string, string> = {
    collections: 'graphics_design_collections',
    assets: 'graphics_design_assets',
    blogs: 'blogs',
    projects: 'projects',
    social: 'social_links',
    footer: 'footer_config',
    site_content: 'site_content',
    binder_showcases: 'binder_showcases',
    binder_showcase_images: 'binder_showcase_images',
    binder_showcase_sets: 'binder_showcase_sets',
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

function errorMessage(err: unknown) {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const message = obj.message;
    if (typeof message === 'string' && message.trim()) return message;
    const details = obj.details;
    if (typeof details === 'string' && details.trim()) return details;
    const hint = obj.hint;
    if (typeof hint === 'string' && hint.trim()) return hint;
    const code = obj.code;
    if (typeof code === 'string' && code.trim()) return `Error code: ${code}`;
  }
  return 'Unknown admin API error';
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
