# Graphics Design Portfolio - Upload to Supabase

**Drag and drop** the contents of this folder (the numbered folders like `01-sogki-myself`, `02-genshin-inspired`, etc.) into your **graphics-design-portfolio** bucket in Supabase Storage.

## Steps

1. Open Supabase Dashboard → Storage → graphics-design-portfolio bucket
2. Drag the **contents** of this folder (or each subfolder) into the bucket root
3. The bucket should have folders: `01-sogki-myself`, `02-genshin-inspired`, etc.

## Note: VALORANT Sage Banner

The file `07-game-inspired/valorant-agent-banner-sage.png` failed to download (source URL returned 400). If you have this image locally, add it manually to that folder before uploading. Otherwise that asset will show a broken image until you add it.

## After uploading

Run the updated seed migration `003_seed_graphics_design_portfolio.sql` so the database uses the new bucket paths instead of external URLs.
