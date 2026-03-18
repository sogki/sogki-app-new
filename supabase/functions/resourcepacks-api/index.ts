import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const BUCKET_RESOURCEPACKS = 'resourcepacks';
const DEFAULT_SITE_URL = 'https://sogki.dev';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const match = url.pathname.match(/\/resourcepacks-api(?:\/(.*))?$/);
  const path = (match?.[1] ?? '').replace(/^\/+/, '');
  const parts = path ? path.split('/').filter(Boolean) : [];
  const [first] = parts;
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? DEFAULT_SITE_URL).replace(/\/$/, '');

  try {
    if (first === 'active') {
      const { data, error } = await supabase
        .from('resource_packs')
        .select('id, sha1')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return json(
        (data ?? []).map((row: { id: string; sha1: string }) => ({
          url: `${siteUrl}/api/resourcepacks/${row.id}`,
          sha1: row.sha1,
        }))
      );
    }

    const id = first;
    if (!id) return json({ error: 'Resource pack id required' }, 400);
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return json({ error: 'Invalid resource pack id' }, 400);

    const { data: pack, error } = await supabase
      .from('resource_packs')
      .select('id, file_name, file_path')
      .eq('id', id)
      .single();
    if (error || !pack) return json({ error: 'Not found' }, 404);

    const { data: publicUrlData } = supabase
      .storage
      .from(BUCKET_RESOURCEPACKS)
      .getPublicUrl(pack.file_path);

    const redirectHeaders = {
      ...corsHeaders,
      Location: publicUrlData.publicUrl,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pack.file_name}"`,
      'Cache-Control': 'public, max-age=300',
    };

    return new Response(null, { status: 302, headers: redirectHeaders });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
