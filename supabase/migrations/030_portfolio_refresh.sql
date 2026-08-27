-- Portfolio refresh: about bio, ARCPedia rename, work order, Binderly preview, footer

-- About Me — more personal, spotlight ARCPedia / Binderly / RankTheGlobe
UPDATE public.site_content
SET value = '"I''m Sogki — or just Jay. I''m a software engineer and designer who gets restless unless I''m building something I actually care about."'::jsonb,
    updated_at = now()
WHERE key = 'about.bio_1';

UPDATE public.site_content
SET value = '"I grew up between games, collecting, and online communities, so that''s where my work naturally lands. I like products with taste — sharp UI, clear purpose, and enough depth that people come back."'::jsonb,
    updated_at = now()
WHERE key = 'about.bio_2';

UPDATE public.site_content
SET value = '"The through-line is ARCPedia, Binderly, and RankTheGlobe: different chapters, same instinct to ship tools for players, collectors, and crowds that need something better than a spreadsheet."'::jsonb,
    updated_at = now()
WHERE key = 'about.bio_3';

-- Binderly featured preview (proxied to sogki.dev in the app)
UPDATE public.projects SET
  hero_image_url = 'https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/assets/binderly-preview.png',
  screenshots = ARRAY['https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/assets/binderly-preview.png'],
  updated_at = now()
WHERE title = 'Binderly TCG';

-- ArcRaiders Companion → ARCPedia
UPDATE public.projects SET
  title = 'ARCPedia',
  title_jp = 'ARCPedia',
  slug = 'arcpedia',
  tagline = 'Live companion for Arc Raiders — events, maps, item intel, and raid planning.',
  description = 'Production Arc Raiders companion with live event tracking, interactive maps, item intelligence, and raid planning tools.',
  long_description = E'## ARCPedia\n\nProduction Arc Raiders companion with event tracking, interactive maps, a 480+ item database, and raid planning workflows.\n\nFormerly ArcRaiders Companion — same product, new name.',
  featured = true,
  tier = 'featured',
  sort_order = 2,
  updated_at = now()
WHERE title = 'ArcRaiders Companion' OR slug = 'arc-raiders-companion';

-- All Work page order:
-- Page 1: ARCPedia, 50andBad, BLXR, Profiles After Dark, RankTheGlobe
-- Page 2: TikTok Live API, Marlow Marketing
UPDATE public.projects SET sort_order = 3, updated_at = now() WHERE title = '50andBad Platform';
UPDATE public.projects SET sort_order = 4, updated_at = now() WHERE title = 'BLXR';
UPDATE public.projects SET sort_order = 5, updated_at = now() WHERE title = 'Profiles After Dark';
UPDATE public.projects SET sort_order = 6, updated_at = now() WHERE title = 'RankTheGlobe';
UPDATE public.projects SET sort_order = 7, featured = false, tier = 'supporting', updated_at = now()
WHERE title = 'TikTok Live API' OR slug = 'tiktok-live-api';
UPDATE public.projects SET sort_order = 8, updated_at = now() WHERE title = 'Marlow Marketing';

-- Footer Work column
UPDATE public.footer_config SET
  value = '[
    {"name": "Binderly TCG", "url": "https://binderlytcg.com"},
    {"name": "50andBad", "url": "https://50andbad.site"},
    {"name": "ARCPedia", "url": "https://arcraiders.50andbad.site"}
  ]'::jsonb,
  updated_at = now()
WHERE key = 'featured_projects';
