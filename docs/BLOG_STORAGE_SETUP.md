# Blog Images Storage Setup

The blog feature uploads images to a Supabase Storage bucket. Create it once:

1. Open **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Name: `blog-images`
4. **Public bucket**: Yes (so blog images are viewable without auth)
5. Click **Create bucket**

The admin API uses the service role to upload; no additional policies are needed for uploads.
