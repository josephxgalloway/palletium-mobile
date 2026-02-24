# Apple Compliance Matrix — Palletium Mobile

**Last Updated:** February 23, 2026
**Last Verified Against Apple Docs:** February 23, 2026
**Classification:** Reader App (music streaming)
**Bundle ID:** com.palletium.app
**Status:** Pre-submission

> **This matrix must be re-verified against Apple's current guidelines before every App Store submission.** Apple's policies change without notice. The sources below were accurate as of the verification date.

## Policy Sources

| Document | Reference | Relevant Section |
|----------|-----------|-----------------|
| Reader Apps (Apple Support) | https://developer.apple.com/support/reader-apps/ | Eligibility, entitlement requirements, implementation |
| App Store Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ | 3.1.3(a) "Reader" Apps |
| US Storefront External Link Update | Apple Developer News (May 2025) | External Link Account Entitlement not required for US |
| Court Ruling Impact | Guidelines 3.1.1(a), 3.1.3, 3.1.3(a) | US storefront: external links/buttons/CTAs permitted |

## Reader App Qualification

Palletium qualifies as a reader app because:
- **Primary functionality:** Music streaming (explicitly listed: "audio, music")
- **Account sign-in:** Users sign in to access content
- **Previously purchased content:** Subscribers access streaming via subscriptions purchased outside the app
- **Precedent:** Spotify, Kindle, Netflix operate under this classification

## Compliance Matrix

| Behavior | US Storefront | Non-US Storefront | Revenue Path | Kernel Lock |
|----------|--------------|-------------------|--------------|-------------|
| Account creation / sign-in | Allowed (no entitlement) | Allowed (no entitlement) | N/A | No |
| Link to web for subscription purchase | Allowed per current Apple guidance as of Feb 2026 — no entitlement required | Requires External Link Account Entitlement; system interstitial shown by iOS before navigation | Stripe web checkout (`palletium.com/subscription`) | **YES** — external only |
| Display subscription status/benefits | Allowed | Allowed | N/A | No |
| Display subscription prices | Allowed per current guidance | Verify entitlement terms before displaying — may require approval first | N/A | No |
| Artist verification fee ($49.99/yr) | External web checkout | External web checkout (entitlement required for link-out) | Stripe web checkout | **YES** — external only |
| Season Pass purchase | External web checkout | External web checkout (entitlement required) | Stripe web checkout | **YES** — external only |
| XP Booster purchase | External web checkout | External web checkout (entitlement required) | Stripe web checkout | **YES** — external only |
| Marketplace transactions | External web checkout | External web checkout (entitlement required) | Stripe web checkout | **YES** — external only |
| Sync Licensing purchase | External web checkout | External web checkout (entitlement required) | Stripe web checkout | **YES** — external only |
| **Any future digital good** | External web checkout | External web checkout (entitlement required) | Stripe web checkout | **YES** — external only |

## Entitlement Status

| Item | Status | Owner |
|------|--------|-------|
| Apple Developer Account Holder confirmed | Pending | Joseph |
| External Link Account Entitlement request submitted | Not started | Joseph (via Apple Developer portal) |
| Xcode `.entitlements` file configured | Not started | After entitlement approval |
| `Info.plist` URL mapping (region to URL) | Not started | After entitlement approval |
| App Store category set to Music | Not started | On submission |

## Non-US Implementation Requirements (After Entitlement Approval)

1. Use Apple's documented External Link Account API — not raw `WebBrowser.openBrowserAsync()` for the entitlement-governed link-out
2. iOS shows a system interstitial modal before navigation — do not suppress, customize, or attempt to bypass
3. URL in `Info.plist` must exactly match the URL in the submitted app binary
4. Link must go to **your website** (`palletium.com`), not directly to Stripe's checkout domain
5. Each `Info.plist` entry maps a region code (or `*` default) to a single destination URL

## Forbidden — Will Invalidate Reader App Classification

- Importing StoreKit purchase APIs
- Importing `react-native-iap`, `expo-in-app-purchases`, or equivalent
- Offering Apple IAP for any digital good
- Processing payments through Apple's payment system
- Displaying IAP price sheets or purchase confirmations
- Any future feature that charges users via native purchase flow

**This list is kernel-locked. Violations cannot be rolled back — App Review history persists.**
**Enforced by CI guard: `npm run guard:no-iap`**
