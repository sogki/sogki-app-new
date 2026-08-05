# Ei — Personal Command System

A private React Native (Expo) companion app for the sogki.dev admin panel. Mirrors your Life Dashboard, projects, and tools on iPhone — built for sideloading, not the App Store.

## Features

- **Dashboard** — Personal overview, stats, habits, goals, notes, and active projects
- **Projects** — Personal project tracker + portfolio projects from your CMS
- **Tools** — Investments, reading progress, job search stats, and admin tool shortcuts
- **Auth** — Discord OAuth via the same backend as the web admin panel

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
```

## Building an IPA for Sideloading

1. Log in to EAS: `eas login`
2. Configure the project: `eas build:configure`
3. Build for iOS: `eas build --platform ios --profile preview`
4. Download the `.ipa` from the EAS dashboard
5. Install via [AltStore](https://altstore.io/), [Sideloadly](https://sideloadly.io/), or Xcode

For ad-hoc distribution to your device, use a `preview` or `production` profile with your Apple provisioning profile.

## Authentication

The app uses the same Discord OAuth flow as the web admin panel. After authorising, the auth callback redirects to `eimobile://auth?token=...` which the app captures via deep linking.

**Deploy the updated auth callback** after pulling these changes:

```bash
npx supabase functions deploy auth-discord-callback
```

## Project Structure

```
ei-mobile/
├── app/                  # Expo Router screens
│   ├── login.tsx         # Discord OAuth login
│   └── (tabs)/           # Main tab navigation
│       ├── index.tsx     # Dashboard
│       ├── projects.tsx  # Projects
│       └── tools.tsx     # Tools & quick links
├── src/
│   ├── config/           # Supabase credentials
│   ├── context/          # Auth provider
│   ├── lib/              # API client, types, formatters
│   ├── components/       # UI + dashboard widgets
│   └── theme/            # Colors and spacing
├── app.json              # Expo config
└── eas.json              # EAS Build profiles
```

## Backend

Connects to the same Supabase project as the web admin panel:

- `admin-api` Edge Function for dashboard data, projects, and CMS resources
- `market-vuag` for investment quotes
- `auth-discord-callback` for OAuth (with mobile deep link support)

## Design

Dark, futuristic UI inspired by AI command interfaces — purple/indigo accents, glass-morphism cards, smooth haptic feedback on interactions.
