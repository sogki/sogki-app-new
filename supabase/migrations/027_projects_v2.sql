-- Portfolio projects v2: status, tier, case study fields

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'supporting',
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS status_note TEXT,
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS screenshots TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS show_demo_link BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);
CREATE INDEX IF NOT EXISTS idx_projects_tier ON public.projects (tier);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);

-- Binderly TCG — main project, closed beta
UPDATE public.projects SET
  slug = 'binderly-tcg',
  status = 'closed_beta',
  tier = 'main',
  tagline = 'My main project — a modern home for Pokémon card collections. Binders, pricing, and discovery.',
  status_note = 'Closed beta — request access at binderlytcg.com',
  description = 'The ultimate Pokemon card collection platform. Organize, track, and discover rare cards with real-time pricing and market insights.',
  long_description = E'## Why I built Binderly\n\nAs a collector, I wanted one place to manage binders, track card values, and discover what to add next — without juggling spreadsheets and half a dozen apps.\n\n## What it does\n\n- Digital binder pages with drag-and-drop organization\n- Real-time pricing and market insights\n- Collection tracking across sets and rarities\n- Built for collectors who care about the details\n\n## Stack\n\nNext.js, React, TypeScript, PostgreSQL, real-time data pipelines.\n\n## Status\n\nCurrently in **closed beta**. Visit [binderlytcg.com](https://binderlytcg.com) to learn more.',
  hero_image_url = 'https://binderlytcg.com/og-image.png',
  screenshots = ARRAY['https://binderlytcg.com/og-image.png'],
  metrics = '[{"label":"Status","value":"Closed Beta"},{"label":"Focus","value":"Pokémon TCG"},{"label":"Stack","value":"Next.js + PostgreSQL"}]'::jsonb,
  accent_color = 'from-amber-500 to-orange-600',
  show_demo_link = true,
  featured = true,
  color = 'from-amber-500 to-orange-600',
  sort_order = 1,
  updated_at = now()
WHERE title = 'Binderly TCG';

-- ArcRaiders Companion
UPDATE public.projects SET
  slug = 'arc-raiders-companion',
  status = 'live',
  tier = 'featured',
  tagline = 'Live companion for Arc Raiders — events, maps, item intel, and raid planning.',
  description = 'A fully featured Arc Raiders companion with live event tracking, interactive maps, item intelligence, and raid planning tools.',
  long_description = E'Production Arc Raiders companion with event tracking, interactive maps, a 480+ item database, and raid planning workflows.',
  accent_color = 'from-indigo-500 to-blue-500',
  show_demo_link = true,
  featured = true,
  sort_order = 2,
  updated_at = now()
WHERE title = 'ArcRaiders Companion';

-- 50andBad Platform
UPDATE public.projects SET
  slug = '50andbad-platform',
  status = 'live',
  tier = 'featured',
  tagline = 'Creator VOD archive with admin tooling and polished discovery UX.',
  show_demo_link = true,
  featured = true,
  sort_order = 3,
  updated_at = now()
WHERE title = '50andBad Platform';

-- BLXR
UPDATE public.projects SET
  slug = 'blxr',
  status = 'live',
  tier = 'supporting',
  tagline = 'Modular backend platform with DSL system and zero-config type generation.',
  show_demo_link = true,
  featured = true,
  sort_order = 4,
  updated_at = now()
WHERE title = 'BLXR';

-- Marlow Marketing
UPDATE public.projects SET
  slug = 'marlow-marketing',
  status = 'live',
  tier = 'supporting',
  tagline = 'Clean, responsive marketing agency site.',
  status_note = 'Client work',
  show_demo_link = true,
  featured = false,
  sort_order = 6,
  updated_at = now()
WHERE title = 'Marlow Marketing';

-- Profiles After Dark — offline
UPDATE public.projects SET
  slug = 'profiles-after-dark',
  status = 'offline',
  tier = 'supporting',
  tagline = 'Aesthetic profile community platform — shipped to 200+ users.',
  status_note = 'This site is no longer live. The platform served 200+ users as an aesthetic profile community before being taken offline.',
  long_description = E'## Profiles After Dark\n\nA community-driven aesthetic profile platform with discovery flows, curated collections, and high-retention browsing experiences.\n\n**Status:** The site is no longer live. It served 200+ users before being taken offline.',
  show_demo_link = false,
  featured = false,
  sort_order = 7,
  updated_at = now()
WHERE title = 'Profiles After Dark';

-- RankTheGlobe — ceased
UPDATE public.projects SET
  slug = 'ranktheglobe',
  status = 'ceased',
  tier = 'supporting',
  tagline = 'Crowd-sourced consumer rankings across web and mobile.',
  status_note = 'Operations ceased due to funding. Built as a full-stack rankings platform during employment at World Ranking Inc.',
  long_description = E'## RankTheGlobe\n\nInteractive crowd-source consumer rankings and ratings platform built with React, React Native, Next.js, and PostgreSQL.\n\n**Status:** Operations ceased due to funding.',
  show_demo_link = false,
  featured = false,
  sort_order = 8,
  updated_at = now()
WHERE title = 'RankTheGlobe';

-- TikTok Live API (may not exist in older DBs)
INSERT INTO public.projects (
  title, title_jp, description, technologies, github, demo,
  featured, color, sort_order, slug, status, tier, tagline, show_demo_link, accent_color
) VALUES (
  'TikTok Live API',
  'TikTok Live API',
  'Developer API to check if any TikTok user is live. REST API with live status, viewer counts, per-developer keys, free tier, and Discord login.',
  ARRAY['REST API', 'TypeScript', 'Discord OAuth', 'Rate limiting'],
  NULL,
  'https://api.50andbad.site',
  true,
  'from-pink-500 to-rose-500',
  5,
  'tiktok-live-api',
  'live',
  'featured',
  'Check if any TikTok user is live — REST API with OAuth and rate limiting.',
  true,
  'from-pink-500 to-rose-500'
)
ON CONFLICT (title) DO UPDATE SET
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  tier = EXCLUDED.tier,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  technologies = EXCLUDED.technologies,
  demo = EXCLUDED.demo,
  featured = EXCLUDED.featured,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  accent_color = EXCLUDED.accent_color,
  show_demo_link = EXCLUDED.show_demo_link,
  updated_at = now();

-- Footer featured projects
UPDATE public.footer_config SET
  value = '[
    {"name": "Binderly TCG", "url": "https://binderlytcg.com"},
    {"name": "ArcRaiders Companion", "url": "https://arcraiders.50andbad.site"},
    {"name": "TikTok Live API", "url": "https://api.50andbad.site"}
  ]'::jsonb,
  updated_at = now()
WHERE key = 'featured_projects';
