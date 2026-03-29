-- Remove seeded placeholder blurb if still unchanged (custom copy in admin is left alone)
UPDATE public.site_content
SET value = '""'::jsonb, updated_at = now()
WHERE key = 'collection.section_description'
  AND value = '"Master sets, binder pages, and favorite pulls — a personal side of my collecting hobby alongside engineering work."'::jsonb;
