-- Pokemon / TCG collection section copy + feature flag
INSERT INTO public.site_content (key, value, content_type, section, label, sort_order) VALUES
  ('collection.section_title', '"Cards & binders"'::jsonb, 'text', 'general', 'Collection section title', 50),
  ('collection.section_title_jp', '"コレクション"'::jsonb, 'text', 'general', 'Collection section title (JP)', 51),
  ('collection.section_description', '""'::jsonb, 'text', 'general', 'Collection page blurb (optional)', 52),
  ('feature.show_collection', 'true'::jsonb, 'boolean', 'feature_flags', 'Show TCG collection page & nav link', 105)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  content_type = EXCLUDED.content_type,
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
