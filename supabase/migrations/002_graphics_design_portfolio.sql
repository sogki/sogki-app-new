-- ============================================
-- Graphics Design Portfolio Tables
-- ============================================
-- Run this in Supabase SQL Editor after 001_create_keys_table.sql
--
-- Storage bucket: Create manually in Dashboard → Storage → New bucket
--   Name: graphics-design-portfolio
--   Public: Yes (for portfolio display)
-- ============================================

-- Collections (client groupings)
CREATE TABLE IF NOT EXISTS public.graphics_design_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client      TEXT NOT NULL,
  summary     TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assets (individual graphic design items)
CREATE TABLE IF NOT EXISTS public.graphics_design_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id         UUID NOT NULL REFERENCES public.graphics_design_collections(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT NOT NULL,
  tools                 TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_class_name   TEXT,
  media_urls             JSONB NOT NULL DEFAULT '[]',
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_graphics_assets_collection ON public.graphics_design_assets (collection_id);
CREATE INDEX IF NOT EXISTS idx_graphics_collections_sort ON public.graphics_design_collections (sort_order);
CREATE INDEX IF NOT EXISTS idx_graphics_assets_sort ON public.graphics_design_assets (collection_id, sort_order);

-- Updated_at trigger for collections
CREATE OR REPLACE FUNCTION public.update_graphics_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS graphics_collections_updated_at ON public.graphics_design_collections;
CREATE TRIGGER graphics_collections_updated_at
  BEFORE UPDATE ON public.graphics_design_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_graphics_collections_updated_at();

-- Updated_at trigger for assets
CREATE OR REPLACE FUNCTION public.update_graphics_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS graphics_assets_updated_at ON public.graphics_design_assets;
CREATE TRIGGER graphics_assets_updated_at
  BEFORE UPDATE ON public.graphics_design_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_graphics_assets_updated_at();

-- RLS: Public read for portfolio display
ALTER TABLE public.graphics_design_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphics_design_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections are publicly readable" ON public.graphics_design_collections;
CREATE POLICY "Collections are publicly readable"
  ON public.graphics_design_collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Assets are publicly readable" ON public.graphics_design_assets;
CREATE POLICY "Assets are publicly readable"
  ON public.graphics_design_assets FOR SELECT USING (true);

-- Grants
GRANT SELECT ON public.graphics_design_collections TO anon, authenticated;
GRANT SELECT ON public.graphics_design_assets TO anon, authenticated;
