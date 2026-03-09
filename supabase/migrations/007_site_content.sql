-- ============================================
-- Site Content: Editable content & feature flags
-- ============================================
-- Key-value store for all editable content on the site.
-- Supports real-time editing from admin panel.
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  value           JSONB NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'text',  -- text, richtext, number, boolean, json
  section         TEXT NOT NULL DEFAULT 'general',  -- hero, about, projects, features, contact, footer, feature_flags
  label           TEXT,  -- Human-readable label for admin UI
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_content_key ON public.site_content (key);
CREATE INDEX IF NOT EXISTS idx_site_content_section ON public.site_content (section);

CREATE OR REPLACE FUNCTION public.update_site_content_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS site_content_updated_at ON public.site_content;
CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_site_content_updated_at();

-- RLS: Public read for site display
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Site content is publicly readable" ON public.site_content;
CREATE POLICY "Site content is publicly readable" ON public.site_content FOR SELECT USING (true);
GRANT SELECT ON public.site_content TO anon, authenticated;

-- ============================================
-- Seed: All editable content from current site
-- ============================================

INSERT INTO public.site_content (key, value, content_type, section, label, sort_order) VALUES
  -- Hero
  ('hero.title', '"Sogki"'::jsonb, 'text', 'hero', 'Main title', 1),
  ('hero.subtitle_jp', '"ソフトウェアエンジニア・デザイナー"'::jsonb, 'text', 'hero', 'Japanese subtitle', 2),
  ('hero.subtitle', '"Full-stack engineer shipping production products end-to-end"'::jsonb, 'text', 'hero', 'Subtitle', 3),
  ('hero.description_1', '"Crafting digital products that combine visual identity, real-world utility, and scalable architecture."'::jsonb, 'text', 'hero', 'Description paragraph 1', 4),
  ('hero.description_2', '"Production-ready work across companion apps, creator platforms, and community experiences."'::jsonb, 'text', 'hero', 'Description paragraph 2', 5),
  ('hero.cta_projects', '"View Projects"'::jsonb, 'text', 'hero', 'CTA button: Projects', 6),
  ('hero.cta_contact', '"Get in Touch"'::jsonb, 'text', 'hero', 'CTA button: Contact', 7),
  -- About
  ('about.section_title', '"About Me"'::jsonb, 'text', 'about', 'Section title', 10),
  ('about.section_title_jp', '"私について"'::jsonb, 'text', 'about', 'Section title (JP)', 11),
  ('about.bio_1', '"I am Sogki, a full-stack software engineer focused on shipping production products that users return to."'::jsonb, 'text', 'about', 'Bio paragraph 1', 12),
  ('about.bio_2', '"My work spans creator ecosystems, companion tools, and community platforms. I build the full stack: data models, backend logic, frontend UX, and iteration loops."'::jsonb, 'text', 'about', 'Bio paragraph 2', 13),
  ('about.bio_3', '"Projects like 50andBad, ArcRaiders Companion, and Profiles After Dark represent my approach: strong visual direction, practical product value, and scalable engineering."'::jsonb, 'text', 'about', 'Bio paragraph 3', 14),
  ('about.starmap_label', '"Explore My Starmap"'::jsonb, 'text', 'about', 'Starmap button label', 15),
  ('about.stats_title', '"By The Numbers"'::jsonb, 'text', 'about', 'Stats section title', 16),
  ('about.stats_title_jp', '"数字で見る実績"'::jsonb, 'text', 'about', 'Stats section title (JP)', 17),
  ('about.stats', '[
    {"value": 12, "suffix": "+", "label": "Projects Built", "labelJp": "構築されたプロジェクト"},
    {"value": 200, "suffix": "+", "label": "Users Served", "labelJp": "サービス提供ユーザー"},
    {"value": 3, "suffix": "+", "label": "Live Platforms", "labelJp": "本番公開プラットフォーム"},
    {"value": 480, "suffix": "+", "label": "Arc Items Indexed", "labelJp": "Arcアイテム登録数"}
  ]'::jsonb, 'json', 'about', 'Stats (value, suffix, label, labelJp)', 18),
  -- Features
  ('features.section_title', '"What I Bring"'::jsonb, 'text', 'features', 'Section title', 20),
  ('features.section_title_jp', '"私が提供するもの"'::jsonb, 'text', 'features', 'Section title (JP)', 21),
  -- Projects (section headers - project data from projects table)
  ('projects.section_title', '"Featured Projects"'::jsonb, 'text', 'projects', 'Section title', 30),
  ('projects.section_title_jp', '"注目のプロジェクト"'::jsonb, 'text', 'projects', 'Section title (JP)', 31),
  ('projects.section_description', '"Production websites and platforms that demonstrate product depth, technical execution, and visual craft"'::jsonb, 'text', 'projects', 'Section description', 32),
  ('projects.more_title', '"More Projects"'::jsonb, 'text', 'projects', '"More Projects" heading', 33),
  -- Contact
  ('contact.section_title', '"Get in touch"'::jsonb, 'text', 'contact', 'Section title', 40),
  ('contact.section_title_jp', '"連絡を取る"'::jsonb, 'text', 'contact', 'Section title (JP)', 41),
  ('contact.description', '"Ready to collaborate on something extraordinary? Reach out to me on Discord for quick responses and cosmic conversations."'::jsonb, 'text', 'contact', 'Description', 42),
  ('contact.discord_handle', '"@sogki"'::jsonb, 'text', 'contact', 'Discord handle', 43),
  ('contact.discord_label_jp', '"ディスコード"'::jsonb, 'text', 'contact', 'Discord label (JP)', 44),
  ('contact.discord_bio', '"Usually online and ready to chat about projects, tech, or anything cosmic!"'::jsonb, 'text', 'contact', 'Discord bio', 45),
  ('contact.cta_label', '"Message on Discord"'::jsonb, 'text', 'contact', 'CTA button label', 46),
  -- Feature flags (show/hide sections)
  ('feature.show_hero', 'true'::jsonb, 'boolean', 'feature_flags', 'Show Hero section', 100),
  ('feature.show_about', 'true'::jsonb, 'boolean', 'feature_flags', 'Show About section', 101),
  ('feature.show_features', 'true'::jsonb, 'boolean', 'feature_flags', 'Show Features section', 102),
  ('feature.show_projects', 'true'::jsonb, 'boolean', 'feature_flags', 'Show Projects section', 103),
  ('feature.show_contact', 'true'::jsonb, 'boolean', 'feature_flags', 'Show Contact section', 104)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  content_type = EXCLUDED.content_type,
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
