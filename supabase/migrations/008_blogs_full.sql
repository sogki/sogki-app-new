-- ============================================
-- Blogs: Full implementation with image support
-- ============================================
-- Extends blogs table, adds blog_images for tracking uploads,
-- and ensures content supports markdown with embedded images.
-- ============================================

-- Add columns to blogs if they don't exist (for existing deployments)
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Sogki';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS reading_time_minutes INT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Blog images: tracks uploaded images per blog for cleanup and reference
-- Images are embedded in content as markdown ![alt](url); this table tracks the uploads
CREATE TABLE IF NOT EXISTS public.blog_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id         UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  public_url      TEXT NOT NULL,
  alt_text        TEXT,
  caption         TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_images_blog_id ON public.blog_images (blog_id);

-- RLS for blog_images (public read for published blogs' images)
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Blog images readable with blog" ON public.blog_images;
CREATE POLICY "Blog images readable with blog" ON public.blog_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      WHERE b.id = blog_images.blog_id AND b.published_at IS NOT NULL
    )
  );
GRANT SELECT ON public.blog_images TO anon, authenticated;

-- Storage bucket: blog-images
-- Create via Supabase Dashboard: Storage → New bucket → "blog-images" (public)
-- Public buckets allow direct URL access without auth
