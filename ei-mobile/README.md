# Ei — Personal Command System

Private React Native (Expo 54) companion for the sogki.dev admin panel. Mirrors your Life Dashboard, camera vision, CMS tools, and site controls on device — built for sideloading, not the App Store.

## Features

- **Dashboard** — Reorderable life overview: habits, goals, reminders, notes, investments (VUAG), job search, reading, weather, projects, Ei assistant
- **Camera / Vision** — Auto-classify OCR / identify / translate, barcode product lookup, QR risk analysis, scan memory, Ask Ei handoff
- **Projects** — Personal life projects + portfolio CMS projects
- **Tools** — CVs, scan library, blogs, Minecraft resource packs, TCG binders, feature flags, presence / travel tracking
- **Settings** — Feature flags, presence, scan library shortcuts
- **Auth** — Discord OAuth via the same Supabase backend as the web admin

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/setup/) for IPA builds (`npm install -g eas-cli`)
- Apple Developer account (for device builds and sideloading)

## Setup

```bash
cd ei-mobile
npm install
```

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Typecheck
npm run typecheck
```

## Building an IPA for Sideloading

1. Log in to EAS: `eas login`
2. Configure the project: `eas build:configure`
3. Build for iOS: `eas build --platform ios --profile preview`
4. Download the `.ipa` from the EAS dashboard
5. Install via [AltStore](https://altstore.io/), [Sideloadly](https://sideloadly.io/), or Xcode

For ad-hoc distribution to your device, use a `preview` or `production` profile with your Apple provisioning profile.

## Authentication

The app uses the same Discord OAuth flow as the web admin panel. After authorising, the auth callback redirects to `eimobile://auth?token=...` which the app captures via deep linking. The admin JWT is stored in SecureStore.

**Deploy the updated auth callback** after pulling these changes:

```bash
npx supabase functions deploy auth-discord-callback
```

## Project Structure

```
ei-mobile/
├── app/                      # Expo Router screens
│   ├── login.tsx             # Discord OAuth login
│   ├── (tabs)/               # Camera · Projects · Dashboard · Tools · Settings
│   └── tools/                # CVs, scans, blogs, packs, binders, flags, presence
├── src/
│   ├── config/               # Supabase bootstrap
│   ├── context/              # Auth, LifeDashboard cache, PendingEiAsk
│   ├── lib/                  # API client, vision, presence, assistant, types
│   ├── components/           # UI + dashboard + camera widgets
│   └── theme/                # Colors and spacing
├── app.json                  # Expo config
└── eas.json                  # EAS Build profiles
```

## Backend

Connects to the same Supabase project as the web admin panel:

- `admin-api` — life dashboard, projects, CMS resources, site content
- `ei-chat` / `ei-vision` — cloud assistant + vision pipeline
- `market-vuag` — investment quotes
- `auth-discord-callback` — OAuth (with mobile deep link support)

## Design

Dark command-interface UI — near-black surfaces, purple accents, glass cards, haptic feedback on camera and key actions.
