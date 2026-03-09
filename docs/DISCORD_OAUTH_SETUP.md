# Discord OAuth Setup for Admin Panel

This guide walks you through creating a Discord application and configuring it for admin authentication.

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it (e.g. "Sogki Admin") and create

## 2. OAuth2 Configuration

1. In your application, go to **OAuth2** → **General**
2. Copy the **Client ID** and **Client Secret**
3. Add these to your Supabase `keys` table:
   - `DISCORD_CLIENT_ID` = your Client ID (public, used by frontend for login URL)
   - `DISCORD_CLIENT_SECRET` = your Client Secret

## 3. Redirect URIs

Go to **OAuth2** → **Redirects** and add:

| Environment | Redirect URI |
|-------------|--------------|
| **Local dev** | `http://localhost:54321/functions/v1/auth-discord-callback` |
| **Production** | `https://vwdrdqkzjkfdmycomfvf.supabase.co/functions/v1/auth-discord-callback` |

Replace `vwdrdqkzjkfdmycomfvf` with your Supabase project ref if different.

**Important:** Add both URIs if you develop locally with Supabase CLI (`supabase start`). For production, use the Supabase project URL.

## 4. OAuth2 Scopes

For the authorization URL, use scope: **`identify`**

That's all you need to get the user's Discord ID.

## 5. Keys Table Updates

Run this in Supabase SQL Editor (or update via admin once it's working):

```sql
UPDATE public.keys SET value = 'YOUR_CLIENT_ID', is_public = true WHERE key = 'DISCORD_CLIENT_ID';
UPDATE public.keys SET value = 'YOUR_CLIENT_SECRET' WHERE key = 'DISCORD_CLIENT_SECRET';
UPDATE public.keys SET value = 'your-random-32-char-secret-here' WHERE key = 'ADMIN_JWT_SECRET';
UPDATE public.keys SET value = 'https://yoursite.com' WHERE key = 'ADMIN_SITE_URL';
```

Note: `DISCORD_CLIENT_ID` must have `is_public = true` so the frontend can fetch it to build the login URL.

- **ADMIN_JWT_SECRET**: Generate a random 32+ character string (e.g. `openssl rand -hex 32`)
- **ADMIN_SITE_URL**: Your production site URL (e.g. `https://sogki.dev`). Use `http://localhost:5173` for local dev.

## 6. Deploy Edge Functions

```bash
# Install Supabase CLI if needed: npm i -g supabase
supabase login
supabase link --project-ref vwdrdqkzjkfdmycomfvf

# Deploy (auth-discord-callback must allow unauthenticated requests for OAuth redirect)
supabase functions deploy auth-discord-callback --no-verify-jwt
supabase functions deploy admin-api
```

## 7. Authorization URL

The admin dashboard builds this URL client-side using `DISCORD_CLIENT_ID` from the keys table:

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&redirect_uri=ENCODED_CALLBACK_URL&response_type=code&scope=identify
```

Where `ENCODED_CALLBACK_URL` = `https://vwdrdqkzjkfdmycomfvf.supabase.co/functions/v1/auth-discord-callback`

---

## 8. Localhost Dev Bypass (Optional)

To skip Discord OAuth when developing on localhost:

1. Generate a dev token: `openssl rand -hex 32`
2. Add to Supabase `keys` table: `ADMIN_DEV_TOKEN` = your token (server-only, `is_public = false`)
3. Add to `.env.local`: `VITE_ADMIN_DEV_TOKEN=your_token_here`

When both are set and you visit `http://localhost:5173/admin`, you'll be logged in automatically. The admin-api only accepts the dev token when the request Origin is localhost, so it stays secure in production.
