# Resource Packs (Minecraft / Cobblemon)

This project now includes a production-ready resource pack hosting flow:

- Admin upload/manage in `/admin/resourcepacks`
- Public JSON endpoint: `/api/resourcepacks/active`
- Direct pack endpoint: `/api/resourcepacks/:id`

## 1) Database

Run migrations (includes `010_resource_packs.sql`):

```bash
npx supabase db push
```

Table:

- `resource_packs(id, name, file_name, file_path, version, sha1, size, created_at, updated_at, is_active)`

## 2) Storage bucket

Create a public bucket in Supabase Storage:

- Bucket name: `resourcepacks`
- Public bucket: enabled

## 3) Deploy functions

```bash
npx supabase functions deploy admin-api
npx supabase functions deploy resourcepacks-api
```

`resourcepacks-api` is public (`verify_jwt = false`) and serves:

- `GET /resourcepacks-api/active`
- `GET /resourcepacks-api/:id` (302 redirect to public zip URL)

## 4) Site-level API paths

`public/_redirects` maps:

- `/api/resourcepacks/active` -> Supabase `resourcepacks-api/active`
- `/api/resourcepacks/:id` -> Supabase `resourcepacks-api/:id`

## 5) Example response

`GET https://sogki.dev/api/resourcepacks/active`

```json
[
  {
    "url": "https://sogki.dev/api/resourcepacks/123e4567-e89b-12d3-a456-426614174000",
    "sha1": "abc123def4567890abc123def4567890abc123de"
  }
]
```

## Notes

- SHA1 is generated at upload and stored in `resource_packs.sha1`.
- Upload API accepts only `.zip` files.
- `auto_deactivate_previous` can deactivate older active packs for the same `name`.
