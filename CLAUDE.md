# CLAUDE.md — Palletium Mobile

> **Canonical project knowledge:** See `palletium-platform/CLAUDE.md` and `palletium-platform/MASTER_DOCUMENTATION.md` for the complete platform reference. This repo is one of four:
> - `palletium-platform` — Next.js 15 web frontend (Vercel)
> - `palletium-api` — Express backend (Railway)
> - `palletium-mobile` — React Native/Expo mobile app (this repo)
> - `palletium-audio` — Audio analysis service

## Project Overview

Palletium Mobile — React Native music streaming app built with Expo 54, React Native 0.81, and Expo Router 6. Streams music, records plays, displays economic settlement data, and manages subscriptions via external Stripe checkout.

**Bundle ID:** `com.palletium.app`
**Scheme:** `palletium`
**Apple Team ID:** `YA3THH7C6Z`
**Expo Project ID:** `9c102464-a6ad-4b18-a401-bf1973328fe2`

## Commands

```bash
npx expo start                    # Dev server (Expo Go or dev client)
npx expo start --dev-client       # Dev client (native modules)
eas build --platform ios --profile preview     # Ad hoc iOS build
eas build --platform ios --profile production  # App Store build
eas submit --platform ios                      # Submit to TestFlight/App Store
eas build --platform android --profile preview # Android APK
```

## API Configuration

- **Base URL env var:** `EXPO_PUBLIC_API_URL`
- **Development:** `http://localhost:3001`
- **Preview/Production:** `https://api.palletium.com`
- Client appends `/api` — so requests go to `https://api.palletium.com/api/*`
- Axios instance with auth interceptor (SecureStore token) and 401 refresh-token retry

## Architecture

### State Management
- `lib/store/authStore.ts` — Auth state (Zustand, persisted to SecureStore)
- `lib/store/playerStore.ts` — Audio player, 30-second payment gate, preview mode
- `lib/store/paymentHistoryStore.ts` — Play payment history
- `lib/store/gamificationStore.ts` — XP, goals, milestones
- `lib/store/trackEditStore.ts` — Track metadata editing
- `lib/store/networkStore.ts` — Network connectivity

### API Layer
- `lib/api/client.ts` — Axios instance with interceptors
- Exports helper functions: `getDividendSummary`, `getMyTracks`, `getArtistTracks`, etc.
- Import via: `import { apiClient, getMyTracks } from '@/lib/api/client'`

### Key Directories
```
app/
├── (auth)/        # Login, register screens
├── (tabs)/        # Tab navigator (Discover, Library, Rewards, Studio, Profile)
├── admin/         # Admin screens (dashboard, review, trust, payments)
├── artist/        # Artist-specific screens (studio)
├── journey/       # Gamification hub
├── settings/      # Settings, subscription, verification, legal
├── upload/        # Track upload flow
├── player.tsx     # Full-screen player (modal)
├── _layout.tsx    # Root layout (Stripe, theme, auth init)
lib/
├── api/           # API client and helpers
├── store/         # Zustand stores
├── types/         # TypeScript interfaces
├── entitlements.ts # Role detection (Artist + Listener hybrid)
components/
├── player/        # MiniPlayer
├── artist/        # Artist-specific components
├── track-edit/    # Metadata editor components
├── ui/            # Shared UI primitives
config/
├── featureGates.ts # Threshold-based feature gating (mirrors platform)
constants/
├── theme.ts       # Palladium theme (colors, spacing, fonts)
```

## Critical Rules

1. **NO MOCK DATA** — All data from backend API
2. **Auth tokens in SecureStore** — Never localStorage. `accessToken` + `refreshToken` in iOS Keychain / Android encrypted storage.
3. **401 handling** — Single-flight refresh token rotation with queue dedup (`isRefreshing` + `failedQueue` pattern in `client.ts`)
4. **Payment model** — First listen $1.00, repeat $0.01, AI tier $0.004 — all from subscribed listeners. 30-second threshold enforced in `playerStore.ts:434`.
5. **No Apple IAP** — All payments via external Stripe checkout (WebBrowser). Reader App compliance.
6. **Preview mode** — Unauthenticated users get 3 free 15-second previews starting at 30s mark. Fade-out with exponential volume curve.
7. **Feature gates** — Same keys as platform (`badges`, `quests`, `leaderboards`). Gates protect UI; backend protects API.
8. **Path aliases** — `@/*` maps to repo root (`./`)

## Auth Flow

- Email/password login with optional 2FA (TOTP)
- Apple Sign-In (iOS native via `expo-apple-authentication`)
- Google OAuth (via `/api/oauth/google/mobile-init` endpoint)
- Registration sends `legalAcceptance` payload with version string
- Refresh token rotation on 401 (30-day TTL)
- Logout revokes refresh token server-side before clearing local state

## EAS Build Profiles

| Profile | Distribution | API URL | Notes |
|---------|-------------|---------|-------|
| development | simulator | localhost:3001 | Expo Go compatible |
| preview | internal | api.palletium.com | Ad hoc, auto-increment |
| production | store | api.palletium.com | App Store/Play Store, auto-increment |

## Theme

Palladium dark theme matching web platform:
- Background: `#161922` (950)
- Surface: `#1b1f2b` (900)
- Primary: `#c0c8d6` (silver)
- All colors in `constants/theme.ts`

## Known Gaps vs Web Platform

- No upload wizard (web-only for pilot)
- No LegalGuard / forced re-acceptance
- No email verification screen or banner
- No support ticket system
- No crossfade
- No push notifications
- Settings page is shallow (5 sections vs web's 8+ tabs)
- See `FEATURE_GAP_AUDIT.md` for full inventory

## Kernel Lock

Same rules as platform — do NOT modify economic logic:
- Payment rates ($1.00/$0.01/$0.004) are backend-enforced
- 30-second threshold in `playerStore.ts` must match backend
- Self-play detection is backend-only (no client-side check needed)
- See `palletium-platform/CLAUDE.md` → Kernel Lock section for full list

### No StoreKit / In-App Purchase APIs — EVER

**This is a kernel-locked architectural constraint. Do not modify without explicit founder approval.**

Palletium operates as an Apple Reader App. All monetization flows use external web checkout (Stripe via browser). The moment any StoreKit purchase API is imported, Reader App classification is permanently jeopardized and App Review history persists — this cannot be reversed.

**Forbidden imports (enforced by CI guard `npm run guard:no-iap`):**
- `StoreKit` (native)
- `react-native-iap`
- `expo-in-app-purchases`
- `react-native-purchases` (RevenueCat)
- Any library that wraps Apple IAP or Google Play Billing for digital goods

**All monetization features must route through:**
- `WebBrowser.openBrowserAsync()` → `https://palletium.com/subscription` (or equivalent web checkout URL)
- No IAP for: subscriptions, artist verification, Season Pass, XP Boosters, Marketplace, Sync Licensing
- This applies to ALL current and future features

**Apple policy sources (re-verify before every App Store submission):**
- Reader App definition: https://developer.apple.com/support/reader-apps/
- App Store Review Guideline 3.1.3(a)
- See `docs/APPLE_COMPLIANCE_MATRIX.md` for the full compliance matrix
