// Supabase Edge Function: Admin API
// Verifies admin JWT, uses service role for all DB operations
// Handles: graphics, blogs, projects, social, footer, resource packs, binder showcases

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';
import { createHash } from 'node:crypto';
import { extractAndStoreCvText, extractTextFromBytes } from '../_shared/cvTextExtract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const BUCKET_BLOG_IMAGES = 'blog-images';
const BUCKET_RESOURCEPACKS = 'resourcepacks';
const BUCKET_CV_DOCUMENTS = 'cv-documents';
const MAX_BLOG_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BINDER_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RESOURCEPACK_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_CV_BYTES = 15 * 1024 * 1024; // 15 MB

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
  // Supabase may pass either `/functions/v1/admin-api/...` or function-relative `/...`
  const adminMatch = url.pathname.match(/\/admin-api(?:\/(.*))?$/i);
  const relative = adminMatch
    ? (adminMatch[1] ?? '')
    : url.pathname.replace(/^\/+/, '');
  const path = relative.replace(/^\/+/, '');
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
      if (parts[0] === 'cvs' && parts[1] === 'upload' && req.method === 'POST') {
        return await handleCvUpload(supabase, req);
      }
      if (parts[0] === 'cvs' && parts[2] === 'reextract' && req.method === 'POST') {
        return await handleCvReextract(supabase, parts[1]);
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
    case 'collection_master_sets': {
      const { data: msRows, error: msErr } = await supabase
        .from('collection_master_set_entries')
        .select('*')
        .order('sort_order', { ascending: true });
      if (msErr) throw msErr;
      return json(msRows ?? []);
    }
    case 'cvs': {
      if (id === undefined || id === '') {
        const { data: cvRows, error: cvErr } = await supabase
          .from('cv_documents')
          .select(
            'id, title, file_name, file_path, preview_path, public_url, mime_type, size, notes, is_active, created_at, updated_at, extracted_at'
          )
          .order('created_at', { ascending: false });
        if (cvErr) throw cvErr;
        const withUrls = await attachCvSignedUrls(supabase, cvRows ?? [], 60 * 60);
        return json(
          withUrls.map((row: Record<string, unknown>) => ({
            ...row,
            has_text: Boolean(row.extracted_at),
          }))
        );
      }
      if (parts[2] === 'signed-url') {
        return await handleCvSignedUrl(supabase, id, url);
      }
      const { data: cvRow, error: cvOneErr } = await supabase
        .from('cv_documents')
        .select('*')
        .eq('id', id)
        .single();
      if (cvOneErr) throw cvOneErr;
      const [withUrl] = await attachCvSignedUrls(supabase, [cvRow], 60 * 60);
      return json({
        ...withUrl,
        has_text: Boolean(withUrl?.extracted_text || withUrl?.extracted_at),
      });
    }
    case 'life_investments': {
      const symbol = (url.searchParams.get('symbol') || 'VUAG.L').toUpperCase();
      if (id) {
        const { data, error } = await supabase
          .from('life_investments')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return json(data ?? {});
      }
      const { data, error } = await supabase
        .from('life_investments')
        .select('*')
        .eq('symbol', symbol)
        .maybeSingle();
      if (error) throw error;
      return json(
        data ?? {
          symbol,
          name: 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
          exchange: 'LSE',
          holdings: 0,
          invested: null,
        }
      );
    }
    case 'life_dashboard':
    case 'life-dashboard': {
      const { data, error } = await supabase
        .from('life_dashboard_state')
        .select('payload, layout, updated_at')
        .eq('key', 'default')
        .maybeSingle();
      if (error) throw error;
      return json({
        payload: data?.payload ?? {},
        layout: data?.layout ?? {},
        updated_at: data?.updated_at ?? null,
      });
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

async function handleCvUpload(supabase: any, req: Request) {
  const parsed = await parseUploadRequest(req);
  const { fileBytes, filename, mimeType, title, notes, isActive, previewBytes } = parsed;
  if (!fileBytes || !filename) return json({ error: 'file and filename required' }, 400);
  if (fileBytes.byteLength > MAX_CV_BYTES) {
    return json({ error: 'CV file too large. Max size is 15 MB.' }, 413);
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'pdf';
  const allowedExt = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  if (!allowedExt.includes(ext)) {
    return json({ error: 'Only PDF, DOC, DOCX, TXT, and RTF files are allowed.' }, 400);
  }

  const safeTitle = (title ?? '').trim() || filename.replace(/\.[^.]+$/, '');
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `documents/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeFile}`;
  const contentType = mimeType || inferCvMimeType(ext);

  const { data: upload, error: uploadErr } = await supabase.storage
    .from(BUCKET_CV_DOCUMENTS)
    .upload(path, fileBytes, { contentType, upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 400);

  let previewPath: string | null = null;
  if (previewBytes && previewBytes.byteLength > 0) {
    const previewStoragePath = `previews/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    const { data: previewUpload, error: previewErr } = await supabase.storage
      .from(BUCKET_CV_DOCUMENTS)
      .upload(previewStoragePath, previewBytes, { contentType: 'image/png', upsert: false });
    if (!previewErr && previewUpload?.path) {
      previewPath = previewUpload.path;
    }
  }

  const { data, error } = await supabase
    .from('cv_documents')
    .insert({
      title: safeTitle,
      file_name: filename,
      file_path: upload.path,
      preview_path: previewPath,
      public_url: null,
      mime_type: contentType,
      size: fileBytes.byteLength,
      notes: notes ?? null,
      is_active: isActive,
    })
    .select('*')
    .single();

  if (error) {
    const cleanup = [upload.path, previewPath].filter(Boolean) as string[];
    if (cleanup.length) await supabase.storage.from(BUCKET_CV_DOCUMENTS).remove(cleanup);
    return json({ error: error.message }, 400);
  }

  let extracted_text = '';
  let extracted_at: string | null = null;
  try {
    extracted_text = await extractTextFromBytes(
      new Uint8Array(fileBytes),
      contentType,
      filename
    );
    extracted_at = new Date().toISOString();
    await supabase
      .from('cv_documents')
      .update({ extracted_text: extracted_text || null, extracted_at })
      .eq('id', data.id);
  } catch (extractErr) {
    console.error('CV extract-on-upload failed:', extractErr);
  }

  const [withUrl] = await attachCvSignedUrls(
    supabase,
    [{ ...data, extracted_text, extracted_at }],
    60 * 60
  );
  return json({ ...withUrl, has_text: Boolean(extracted_text) });
}

async function handleCvReextract(supabase: any, id: string) {
  if (!id) return json({ error: 'id required' }, 400);
  const { data: row, error } = await supabase
    .from('cv_documents')
    .select('id, file_path, mime_type, file_name')
    .eq('id', id)
    .single();
  if (error) return json({ error: error.message }, 404);
  try {
    const result = await extractAndStoreCvText(supabase, row);
    return json({
      id: row.id,
      ok: true,
      extracted_at: result.extracted_at,
      chars: result.extracted_text.length,
      has_text: result.extracted_text.length > 0,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Extract failed' }, 500);
  }
}

async function handleCvSignedUrl(supabase: any, id: string, url: URL) {
  const expiresIn = Math.min(
    Math.max(Number(url.searchParams.get('expires_in') ?? 3600) || 3600, 60),
    60 * 60 * 24 * 7
  );
  const { data: row, error } = await supabase
    .from('cv_documents')
    .select('id, file_path')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET_CV_DOCUMENTS)
    .createSignedUrl(row.file_path, expiresIn);
  if (signErr) return json({ error: signErr.message }, 400);
  return json({ id: row.id, signed_url: signed.signedUrl, expires_in: expiresIn });
}

async function attachCvSignedUrls(supabase: any, rows: any[], expiresIn: number) {
  const out = [];
  for (const row of rows) {
    if (!row?.file_path) {
      out.push({ ...row, signed_url: null });
      continue;
    }
    const { data: signed, error } = await supabase.storage
      .from(BUCKET_CV_DOCUMENTS)
      .createSignedUrl(row.file_path, expiresIn);
    out.push({
      ...row,
      signed_url: error ? null : signed?.signedUrl ?? null,
    });
  }
  return out;
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
        title: '',
        notes: null as string | null,
        previewBytes: null as Uint8Array | null,
      };
    }
    const buffer = new Uint8Array(await fileField.arrayBuffer());
    const previewField = form.get('preview');
    let previewBytes: Uint8Array | null = null;
    if (previewField instanceof File) {
      previewBytes = new Uint8Array(await previewField.arrayBuffer());
    }
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
      title: String(form.get('title') ?? ''),
      notes: nullableText(form.get('notes')),
      previewBytes,
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
    title: String(body?.title ?? ''),
    notes: body?.notes == null ? null : String(body.notes),
    previewBytes: null as Uint8Array | null,
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

  if (resource === 'cvs' && method === 'DELETE' && id) {
    const { data: existing, error: fetchErr } = await supabase
      .from('cv_documents')
      .select('file_path, preview_path')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;
    const paths = [existing.file_path, existing.preview_path].filter(Boolean);
    if (paths.length) {
      const { error: storageErr } = await supabase.storage.from(BUCKET_CV_DOCUMENTS).remove(paths);
      if (storageErr) throw storageErr;
    }
    const { error: delErr } = await supabase.from('cv_documents').delete().eq('id', id);
    if (delErr) throw delErr;
    return json({ ok: true });
  }

  // Life investments: upsert by symbol (VUAG.L etc.)
  if (resource === 'life_investments' && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    const symbol = String(body.symbol || id || 'VUAG.L').toUpperCase();
    let holdings = Number(body.holdings);
    if (!Number.isFinite(holdings) || holdings < 0) {
      return json({ error: 'holdings must be a non-negative number' }, 400);
    }
    let invested: number | null = null;
    if (body.invested !== undefined && body.invested !== null && body.invested !== '') {
      invested = Number(body.invested);
      if (!Number.isFinite(invested) || invested < 0) {
        return json({ error: 'invested must be a non-negative number' }, 400);
      }
    }
    const row: Record<string, unknown> = {
      symbol,
      holdings,
      invested,
      name: body.name || 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
      exchange: body.exchange || 'LSE',
    };
    // Optional clears for legacy broker override columns (if migration applied)
    if (Object.prototype.hasOwnProperty.call(body, 'broker_price')) {
      row.broker_price = body.broker_price;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'broker_value')) {
      row.broker_value = body.broker_value;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'broker_day_pnl')) {
      row.broker_day_pnl = body.broker_day_pnl;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      row.notes = body.notes;
    }
    const { data, error } = await supabase
      .from('life_investments')
      .upsert(row, { onConflict: 'symbol' })
      .select('*')
      .single();
    if (error) throw error;
    return json(data);
  }

  // Life dashboard state: upsert payload and/or layout
  if (
    (resource === 'life_dashboard' || resource === 'life-dashboard') &&
    (method === 'POST' || method === 'PUT' || method === 'PATCH')
  ) {
    const { data: existing, error: fetchErr } = await supabase
      .from('life_dashboard_state')
      .select('payload, layout')
      .eq('key', 'default')
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const nextPayload =
      body.payload !== undefined
        ? body.payload
        : existing?.payload ?? {};
    const nextLayout =
      body.layout !== undefined
        ? body.layout
        : existing?.layout ?? {};

    const { data, error } = await supabase
      .from('life_dashboard_state')
      .upsert(
        {
          key: 'default',
          payload: nextPayload,
          layout: nextLayout,
        },
        { onConflict: 'key' }
      )
      .select('payload, layout, updated_at')
      .single();
    if (error) throw error;
    return json(data);
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
    collection_master_sets: 'collection_master_set_entries',
    cvs: 'cv_documents',
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

function inferCvMimeType(ext: string) {
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'rtf':
      return 'application/rtf';
    default:
      return 'text/plain';
  }
}
