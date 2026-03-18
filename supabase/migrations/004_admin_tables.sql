-- ============================================
-- Admin Dashboard Tables
-- ============================================
-- Blogs, Projects, Social Links, Footer Config
-- ============================================

-- Blogs (markdown content, preview image)
CREATE TABLE IF NOT EXISTS public.blogs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  content         TEXT NOT NULL,
  preview_image_url TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs (slug);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON public.blogs (published_at) WHERE published_at IS NOT NULL;

-- Projects (moved from hardcoded)
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL UNIQUE,
  title_jp        TEXT,
  description     TEXT NOT NULL,
  technologies    TEXT[] NOT NULL DEFAULT '{}',
  github          TEXT,
  demo            TEXT,
  featured        BOOLEAN NOT NULL DEFAULT false,
  color           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects (featured);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON public.projects (sort_order);

-- Social links (global, used in navbar, footer, hero)
CREATE TABLE IF NOT EXISTS public.social_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL UNIQUE,
  url             TEXT NOT NULL,
  handle          TEXT,
  description     TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_links_sort ON public.social_links (sort_order);

-- Footer config (featured projects, quick links - JSON for flexibility)
CREATE TABLE IF NOT EXISTS public.footer_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  value           JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_blogs_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS blogs_updated_at ON public.blogs;
CREATE TRIGGER blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_blogs_updated_at();

CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();

CREATE OR REPLACE FUNCTION public.update_social_links_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS social_links_updated_at ON public.social_links;
CREATE TRIGGER social_links_updated_at BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.update_social_links_updated_at();

CREATE OR REPLACE FUNCTION public.update_footer_config_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS footer_config_updated_at ON public.footer_config;
CREATE TRIGGER footer_config_updated_at BEFORE UPDATE ON public.footer_config FOR EACH ROW EXECUTE FUNCTION public.update_footer_config_updated_at();

-- RLS: Public read for blogs (published), projects, social_links, footer_config
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published blogs are readable" ON public.blogs;
CREATE POLICY "Published blogs are readable" ON public.blogs FOR SELECT
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Projects are readable" ON public.projects;
CREATE POLICY "Projects are readable" ON public.projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Social links are readable" ON public.social_links;
CREATE POLICY "Social links are readable" ON public.social_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Footer config is readable" ON public.footer_config;
CREATE POLICY "Footer config is readable" ON public.footer_config FOR SELECT USING (true);

-- Admin write access via service_role (RLS bypassed) - no anon/authenticated write policies

GRANT SELECT ON public.blogs TO anon, authenticated;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT SELECT ON public.social_links TO anon, authenticated;
GRANT SELECT ON public.footer_config TO anon, authenticated;
