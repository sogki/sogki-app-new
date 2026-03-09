-- ============================================
-- Admin Keys + Seed Data
-- ============================================
-- Add Discord OAuth keys and admin user ID to keys table
-- Seed projects, social_links, footer_config from current hardcoded data
-- ============================================

-- Discord OAuth + Admin Auth (is_public = false, server-only)
INSERT INTO public.keys (key, value, is_public, description) VALUES
  ('ADMIN_DISCORD_USER_ID', '219380413326426112', false, 'Only this Discord user ID can access admin panel'),
  ('DISCORD_CLIENT_ID', 'YOUR_DISCORD_CLIENT_ID', true, 'Discord OAuth2 Application ID (public - used by client to build login URL)'),
  ('DISCORD_CLIENT_SECRET', 'YOUR_DISCORD_CLIENT_SECRET', false, 'Discord OAuth2 Client Secret'),
  ('ADMIN_JWT_SECRET', 'CHANGE_ME_GENERATE_RANDOM_32_CHARS', false, 'Secret for signing admin JWT - use a random 32+ char string'),
  ('ADMIN_SITE_URL', 'http://localhost:5173', false, 'Site URL for OAuth redirects - use https://yoursite.com in production')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Seed projects (from Projects.tsx + NavbarData)
INSERT INTO public.projects (title, title_jp, description, technologies, github, demo, featured, color, sort_order) VALUES
  ('50andBad Platform', '50andBadのビデオオンデマンドアーカイブ', 'Production platform for creator content and VOD discovery. Built to support curation workflows, admin tooling, and long-term content growth.', ARRAY['Next.js', 'React', 'PostgreSQL', 'TypeScript', 'Supabase'], 'https://github.com/sogki/50andbad-vod-archive', 'https://50andbad.site', true, 'from-green-500 to-emerald-500', 1),
  ('ArcRaiders Companion', 'アークレイダーズコンパニオン', 'A fully featured Arc Raiders companion with live event tracking, interactive maps, item intelligence, and raid planning tools.', ARRAY['Next.js', 'React', 'PostgreSQL', 'TypeScript', 'Supabase'], NULL, 'https://arcraiders.50andbad.site', true, 'from-indigo-500 to-blue-500', 2),
  ('BLXR', 'BLXR', 'Next-generation developer platform for building modular backends. Features innovative DSL system, zero-config type generation, and unified design system.', ARRAY['Next.js', 'TypeScript', 'PostgreSQL', 'React', 'Advanced DSL'], 'https://github.com/sogki/blxr', 'https://blxr.dev', true, 'from-purple-500 to-indigo-500', 3),
  ('Profiles After Dark', '暗闇後のプロフィール', 'A community-driven aesthetic profile platform with discovery flows, curated collections, and high-retention browsing experiences.', ARRAY['Next.js', 'React', 'PostgreSQL', 'TypeScript', 'JavaScript'], 'https://github.com/sogki/profiles-after-dark', 'https://profilesafterdark.com', true, 'from-purple-500 to-indigo-500', 4),
  ('Binderly TCG', 'Binderly TCG', 'The ultimate Pokemon card collection platform. Organize, track, and discover rare cards with real-time pricing and market insights.', ARRAY['React', 'TypeScript', 'PostgreSQL', 'Next.js', 'Real-time Data'], 'https://github.com/sogki/binderly', 'https://binderlytcg.com', true, 'from-purple-500 to-indigo-500', 5),
  ('Marlow Marketing', 'マーケティング', 'A responsive, clean and minimalist website for a marketing agency.', ARRAY['React', 'TypeScript', 'Framer Motion'], 'https://github.com/sogki/marlow-marketing', 'https://marlowmarketing.org', false, 'from-yellow-500 to-orange-500', 6),
  ('RankTheGlobe', '地球儀をランク付けする', 'Interactive crowd-source consumer rankings and ratings platform. Built with React, React Native, Next.js, and PostgreSQL.', ARRAY['React', 'React Native', 'TailwindCSS', 'Nativewind', 'TypeScript', 'PostgreSQL', 'NextJS', 'Shadcn'], 'https://github.com/world-ranking-inc', 'https://ranktheglobe.com', false, 'from-cyan-500 to-teal-500', 7)
ON CONFLICT (title) DO UPDATE SET
  title_jp = EXCLUDED.title_jp,
  description = EXCLUDED.description,
  technologies = EXCLUDED.technologies,
  github = EXCLUDED.github,
  demo = EXCLUDED.demo,
  featured = EXCLUDED.featured,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Seed social links
INSERT INTO public.social_links (platform, url, handle, description, sort_order) VALUES
  ('github', 'https://github.com/sogki', '@sogki', 'Explore my code repositories and contributions', 1),
  ('twitter', 'https://x.com/sogkii', '@sogkii', 'Thoughts on tech, space, and development', 2)
ON CONFLICT (platform) DO UPDATE SET
  url = EXCLUDED.url,
  handle = EXCLUDED.handle,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Seed footer config
INSERT INTO public.footer_config (key, value) VALUES
  ('featured_projects', '[
    {"name": "BLXR.dev", "url": "https://blxr.dev"},
    {"name": "ArcRaiders Companion", "url": "https://arcraiders.50andbad.site"},
    {"name": "Profiles After Dark", "url": "https://profilesafterdark.com"}
  ]'::jsonb),
  ('quick_links', '[
    {"name": "About", "href": "/#about"},
    {"name": "Projects", "href": "/#projects"},
    {"name": "Graphic Design", "href": "/graphic-design"},
    {"name": "Tech Stack", "href": "/#tech-stack"},
    {"name": "Contact", "href": "/#contact"}
  ]'::jsonb),
  ('tagline', '"Full-stack product engineering with a design-first edge"'::jsonb),
  ('philosophy', '{"en": "Beauty lies in simplicity", "jp": "美しさは簡潔にあり"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
