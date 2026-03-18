-- ============================================
-- Resource packs for Minecraft (Cobblemon)
-- ============================================

CREATE TABLE IF NOT EXISTS public.resource_packs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL UNIQUE,
  version     TEXT NOT NULL,
  sha1        TEXT NOT NULL,
  size        INT NOT NULL CHECK (size >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_packs_active ON public.resource_packs (is_active);
CREATE INDEX IF NOT EXISTS idx_resource_packs_name ON public.resource_packs (name);
CREATE INDEX IF NOT EXISTS idx_resource_packs_created_at ON public.resource_packs (created_at DESC);

CREATE OR REPLACE FUNCTION public.update_resource_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resource_packs_updated_at ON public.resource_packs;
CREATE TRIGGER resource_packs_updated_at
BEFORE UPDATE ON public.resource_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_resource_packs_updated_at();

ALTER TABLE public.resource_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resource packs are publicly readable" ON public.resource_packs;
CREATE POLICY "Resource packs are publicly readable"
ON public.resource_packs
FOR SELECT
USING (true);

GRANT SELECT ON public.resource_packs TO anon, authenticated;

-- Storage bucket must be created manually in Supabase dashboard:
--   Bucket name: resourcepacks
--   Public bucket: enabled
