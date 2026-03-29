-- Binder showcases for /collection (admin-managed, public read)

CREATE TABLE IF NOT EXISTS public.binder_showcases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_jp        TEXT,
  description     TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.binder_showcase_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id     UUID NOT NULL REFERENCES public.binder_showcases(id) ON DELETE CASCADE,
  public_url      TEXT NOT NULL,
  storage_path    TEXT,
  sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.binder_showcase_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id     UUID NOT NULL REFERENCES public.binder_showcases(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_jp         TEXT,
  completed       INT NOT NULL DEFAULT 0,
  total           INT NOT NULL DEFAULT 1,
  sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_binder_showcase_images_showcase ON public.binder_showcase_images (showcase_id);
CREATE INDEX IF NOT EXISTS idx_binder_showcase_sets_showcase ON public.binder_showcase_sets (showcase_id);
CREATE INDEX IF NOT EXISTS idx_binder_showcases_sort ON public.binder_showcases (sort_order);

CREATE OR REPLACE FUNCTION public.update_binder_showcases_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS binder_showcases_updated_at ON public.binder_showcases;
CREATE TRIGGER binder_showcases_updated_at
  BEFORE UPDATE ON public.binder_showcases
  FOR EACH ROW EXECUTE FUNCTION public.update_binder_showcases_updated_at();

ALTER TABLE public.binder_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binder_showcase_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binder_showcase_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Binder showcases are publicly readable" ON public.binder_showcases;
CREATE POLICY "Binder showcases are publicly readable" ON public.binder_showcases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Binder showcase images are publicly readable" ON public.binder_showcase_images;
CREATE POLICY "Binder showcase images are publicly readable" ON public.binder_showcase_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Binder showcase sets are publicly readable" ON public.binder_showcase_sets;
CREATE POLICY "Binder showcase sets are publicly readable" ON public.binder_showcase_sets FOR SELECT USING (true);

GRANT SELECT ON public.binder_showcases TO anon, authenticated;
GRANT SELECT ON public.binder_showcase_images TO anon, authenticated;
GRANT SELECT ON public.binder_showcase_sets TO anon, authenticated;
