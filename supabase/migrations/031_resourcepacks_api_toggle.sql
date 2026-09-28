-- Public Minecraft resource pack API is off until an admin turns it on.
-- Service role (admin uploads and the edge function) bypasses RLS.

INSERT INTO public.keys (key, value, is_public, description)
VALUES (
  'resourcepacks_api_enabled',
  'false',
  true,
  'When true, the public resource pack API accepts connections. When false, list and download routes refuse before reading packs or storage.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.resourcepacks_api_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT value = 'true'
      FROM public.keys
      WHERE key = 'resourcepacks_api_enabled'
        AND is_public = true
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.resourcepacks_api_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resourcepacks_api_enabled() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Resource packs are publicly readable" ON public.resource_packs;
CREATE POLICY "Resource packs are publicly readable"
  ON public.resource_packs
  FOR SELECT
  TO anon, authenticated
  USING (public.resourcepacks_api_enabled());
