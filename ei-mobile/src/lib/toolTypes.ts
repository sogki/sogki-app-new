export type CvDocument = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  preview_path: string | null;
  public_url: string | null;
  mime_type: string;
  size: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  signed_url?: string | null;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  preview_image_url: string | null;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ResourcePack = {
  id: string;
  name: string;
  description: string | null;
  file_name: string;
  file_path: string;
  version: string;
  sha1: string;
  size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BinderShowcase = {
  id: string;
  title: string;
  title_jp: string | null;
  description: string | null;
  sort_order: number;
  binder_showcase_images?: Array<{
    id: string;
    showcase_id: string;
    public_url: string;
    storage_path: string | null;
    sort_order: number;
  }>;
  binder_showcase_sets?: Array<{
    id: string;
    showcase_id: string;
    name: string;
    name_jp: string | null;
    description: string | null;
    completed: number;
    total: number;
    sort_order: number;
  }>;
};

export type MasterSetEntry = {
  id: string;
  title: string;
  title_jp: string | null;
  description: string | null;
  progress_percent: number;
  subtitle: string | null;
  sort_order: number;
};

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
