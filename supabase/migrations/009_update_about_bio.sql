-- Update About bio to include "or you can call me Jay"
UPDATE public.site_content
SET value = '"I am Sogki, or you can call me Jay, a full-stack software engineer focused on shipping production products that users return to."'::jsonb
WHERE key = 'about.bio_1';
