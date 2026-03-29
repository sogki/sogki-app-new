-- Standalone master set completion rows for /collection (separate from per-binder sets)

CREATE TABLE IF NOT EXISTS public.collection_master_set_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  title_jp          TEXT,
  description       TEXT,
  progress_percent  INT NOT NULL DEFAULT 0,
  subtitle          TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT collection_master_set_entries_progress_percent_range
    CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_collection_master_set_entries_sort
  ON public.collection_master_set_entries (sort_order);

CREATE OR REPLACE FUNCTION public.update_collection_master_set_entries_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS collection_master_set_entries_updated_at ON public.collection_master_set_entries;
CREATE TRIGGER collection_master_set_entries_updated_at
  BEFORE UPDATE ON public.collection_master_set_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_collection_master_set_entries_updated_at();

ALTER TABLE public.collection_master_set_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collection master set entries are publicly readable" ON public.collection_master_set_entries;
CREATE POLICY "Collection master set entries are publicly readable"
  ON public.collection_master_set_entries FOR SELECT USING (true);
GRANT SELECT ON public.collection_master_set_entries TO anon, authenticated;

INSERT INTO public.site_content (key, value, content_type, section, label, sort_order) VALUES
  ('collection.master_sets_completion_title', '"Master set completion"'::jsonb, 'text', 'general', 'Collection: master sets section title', 53),
  ('collection.master_sets_completion_title_jp', '"マスターセット完成度"'::jsonb, 'text', 'general', 'Collection: master sets section title JP', 54),
  ('collection.master_sets_completion_intro', '""'::jsonb, 'text', 'general', 'Collection: master sets section intro (optional)', 55)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  content_type = EXCLUDED.content_type,
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
