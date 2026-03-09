# Storage Bucket: graphics-design-portfolio

Create this bucket in your Supabase project for new graphic design uploads.

## Create via Dashboard

1. Open **Supabase Dashboard** → your project
2. Go to **Storage**
3. Click **New bucket**
4. Name: `graphics-design-portfolio`
5. **Public bucket**: Yes (portfolio images need to be publicly viewable)
6. Click **Create bucket**

## Usage

- **Existing assets**: The seed migration stores full URLs (e.g. from external Supabase storage). These work without this bucket.
- **New uploads**: Upload files to this bucket, then add rows to `graphics_design_assets` with `media_urls` as `["path/to/file.png"]`. The app resolves bucket paths to public URLs automatically.
