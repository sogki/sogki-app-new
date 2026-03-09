import { supabase } from './supabase';

export type GraphicAsset = {
  id: string;
  title: string;
  category: string;
  description: string;
  tools: string[];
  thumbnail_class_name: string | null;
  media_urls: string[];
};

export type ClientCollection = {
  id: string;
  client: string;
  summary: string;
  assets: GraphicAsset[];
};

const BUCKET_NAME = 'graphics-design-portfolio';

/**
 * Resolves a media URL. If it's a full URL (http/https), return as-is.
 * Otherwise treat as a path in our bucket and return the public URL.
 */
function resolveMediaUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(urlOrPath);
  return data.publicUrl;
}

export async function fetchGraphicsDesignPortfolio(): Promise<ClientCollection[]> {
  const { data: collections, error: collectionsError } = await supabase
    .from('graphics_design_collections')
    .select('id, client, summary, sort_order')
    .order('sort_order', { ascending: true });

  if (collectionsError) {
    throw new Error(`Failed to fetch collections: ${collectionsError.message}`);
  }

  if (!collections?.length) {
    return [];
  }

  const { data: assets, error: assetsError } = await supabase
    .from('graphics_design_assets')
    .select('id, collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order')
    .order('sort_order', { ascending: true });

  if (assetsError) {
    throw new Error(`Failed to fetch assets: ${assetsError.message}`);
  }

  const assetsByCollection = (assets ?? []).reduce<Record<string, GraphicAsset[]>>((acc, row) => {
    const collectionId = row.collection_id;
    if (!acc[collectionId]) acc[collectionId] = [];
    const mediaUrls = Array.isArray(row.media_urls) ? row.media_urls : [];
    acc[collectionId].push({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      tools: row.tools ?? [],
      thumbnail_class_name: row.thumbnail_class_name ?? null,
      media_urls: mediaUrls.map(resolveMediaUrl),
    });
    return acc;
  }, {});

  return collections.map((c) => ({
    id: c.id,
    client: c.client,
    summary: c.summary,
    assets: assetsByCollection[c.id] ?? [],
  }));
}
