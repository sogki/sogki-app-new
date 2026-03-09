import { supabase } from './supabase';

export type Project = {
  id: string;
  title: string;
  title_jp: string | null;
  description: string;
  technologies: string[];
  github: string | null;
  demo: string | null;
  featured: boolean;
  color: string | null;
  sort_order: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  handle: string | null;
  description: string | null;
  sort_order: number;
};

export type FooterConfig = {
  featured_projects: { name: string; url: string }[];
  quick_links: { name: string; href: string }[];
  tagline: string;
  philosophy: { en?: string; jp?: string };
};

export type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  section: string;
  label: string | null;
  sort_order: number;
};

export type SiteContentMap = Record<string, unknown>;

export type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  preview_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchBlogs(): Promise<Blog[]> {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch blogs: ${error.message}`);
  return (data ?? []) as Blog[];
}

export async function fetchBlogBySlug(slug: string): Promise<Blog | null> {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .single();
  if (error || !data) return null;
  return data as Blog;
}

export async function fetchSiteContent(): Promise<SiteContentMap> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch site content: ${error.message}`);
  const rows = (data ?? []) as { key: string; value: unknown }[];
  const map: SiteContentMap = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function fetchSocialLinks(): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch social links: ${error.message}`);
  return (data ?? []) as SocialLink[];
}

export async function fetchFooterConfig(): Promise<FooterConfig> {
  const { data, error } = await supabase.from('footer_config').select('key, value');
  if (error) throw new Error(`Failed to fetch footer config: ${error.message}`);
  const rows = (data ?? []) as { key: string; value: unknown }[];
  const config: Record<string, unknown> = {};
  for (const r of rows) {
    config[r.key] = r.value;
  }
  const taglineVal = config.tagline;
  const tagline = typeof taglineVal === 'string' ? taglineVal : '';
  return {
    featured_projects: (config.featured_projects as { name: string; url: string }[]) ?? [],
    quick_links: (config.quick_links as { name: string; href: string }[]) ?? [],
    tagline,
    philosophy: (config.philosophy as { en?: string; jp?: string }) ?? {},
  };
}
