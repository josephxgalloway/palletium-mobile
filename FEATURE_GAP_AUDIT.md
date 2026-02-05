# Palletium Feature Gap Audit

Generated: 2026-01-22

## Executive Summary

| Metric | Count |
|--------|-------|
| Web Platform Pages | 100 |
| Mobile App Screens | 21 |
| Web API Services | 27 |
| Mobile API Services | 2 |
| Feature Coverage | ~35% |

## Web Platform Pages

```
/achievements/page.tsx
/admin/ai-monitoring/page.tsx
/admin/analytics/page.tsx
/admin/audio-analysis/page.tsx
/admin/audit/page.tsx
/admin/community/page.tsx
/admin/control-center/page.tsx
/admin/dividends/page.tsx
/admin/escrow/page.tsx
/admin/fraud/page.tsx
/admin/invariants/page.tsx
/admin/kernel-health/page.tsx
/admin/kernel-replay/page.tsx
/admin/marketplace/events/page.tsx
/admin/marketplace/qa/page.tsx
/admin/moderation/page.tsx
/admin/ops-status/page.tsx
/admin/ops/health/page.tsx
/admin/payouts/page.tsx
/admin/progression/page.tsx
/admin/retention/page.tsx
/admin/review/page.tsx
/admin/users/page.tsx
/admin/verification/page.tsx
/admin/web-analytics/page.tsx
/analytics/page.tsx
/api-test/page.tsx
/artist/[id]/page.tsx
/artist/earnings-cockpit/page.tsx
/artist/promotions/[id]/edit/page.tsx
/artist/promotions/[id]/page.tsx
/artist/promotions/new/page.tsx
/artist/promotions/page.tsx
/artist/tracks/[id]/metadata/page.tsx
/artist/tracks/page.tsx
/auth/login/page.tsx
/auth/oauth/callback/[provider]/page.tsx
/auth/register/page.tsx
/badges/page.tsx
/challenges/page.tsx
/community-guidelines/page.tsx
/community/page.tsx
/cookies/page.tsx
/dashboard/page.tsx
/discover/page.tsx
/discussions/page.tsx
/dividends/page.tsx
/dmca/page.tsx
/earnings/page.tsx
/following/page.tsx
/forgot-password/page.tsx
/gamification/page.tsx
/goals/page.tsx
/insights/page.tsx
/leaderboard/page.tsx
/legal/accept/page.tsx
/levels/page.tsx
/library/page.tsx
/listener/dividend-wallet/page.tsx
/login/page.tsx
/marketplace/artist/[artistId]/page.tsx
/marketplace/create/page.tsx
/marketplace/edit/[id]/page.tsx
/marketplace/orders/[id]/page.tsx
/marketplace/orders/page.tsx
/marketplace/page.tsx
/page.tsx
/playlists/[id]/page.tsx
/playlists/[id]/stats/page.tsx
/playlists/create/page.tsx
/playlists/discover/page.tsx
/playlists/page.tsx
/playlists/smart/page.tsx
/privacy/page.tsx
/profile/[id]/page.tsx
/profile/page.tsx
/quests/page.tsx
/radio/page.tsx
/register/page.tsx
/reset-password/[token]/page.tsx
/rewards/page.tsx
/search/page.tsx
/season-pass/cancel/page.tsx
/season-pass/page.tsx
/season-pass/success/page.tsx
/settings/billing/page.tsx
/settings/page.tsx
/social/page.tsx
/store/boosters/cancel/page.tsx
/store/boosters/page.tsx
/store/boosters/success/page.tsx
/subscription/page.tsx
/sync/licenses/page.tsx
/sync/page.tsx
/sync/settings/page.tsx
/sync/track/[id]/page.tsx
/taste-evolution/page.tsx
/terms/page.tsx
/test-ui/page.tsx
/tiers/page.tsx
/track/[id]/page.tsx
/transparency/page.tsx
/trending/page.tsx
/upload/page.tsx
/wrapped/page.tsx
```

## Mobile App Screens

```
/(auth)/_layout.tsx
/(auth)/login.tsx
/(auth)/register.tsx
/(tabs)/_layout.tsx
/(tabs)/community.tsx
/(tabs)/index.tsx (Discover)
/(tabs)/library.tsx
/(tabs)/profile.tsx
/(tabs)/search.tsx
/+html.tsx
/+not-found.tsx
/_layout.tsx
/artist/[id].tsx
/artist/studio.tsx
/insights/taste.tsx
/player.tsx
/playlist/[id].tsx
/settings/index.tsx
/settings/legal.tsx
/settings/subscription.tsx
/stats/dividends.tsx
/track/[id].tsx
```

## API Services Comparison

### Web Platform Services (27)
```
admin.service.ts
ai.service.ts
algorithmicAnalytics.service.ts
analysis.service.ts
apiClient.ts
artists.service.ts
auth.service.ts
badges.service.ts
base.ts
boosters.service.ts
challenges.service.ts
client.ts
community.service.ts
dashboard.service.ts
dividends.service.ts
exclusive.service.ts
index.ts
ledger.service.ts
marketplace.service.ts
metadata.service.ts
pall-e.service.ts
promotions.service.ts
quests.service.ts
seasonPass.service.ts
sync.service.ts
tracks.service.ts
webAnalytics.service.ts
```

### Mobile App Services (2)
```
client.ts (general API client with inline endpoints)
subscription.ts
```

## State Stores Comparison

### Web Platform Stores (9)
```
authStore.ts
boosterStore.ts
dataStore.ts
metadataStore.ts
paymentHistoryStore.ts
playerStore.ts
promotionsStore.ts
seasonPassStore.ts
syncStore.ts
```

### Mobile App Stores (4)
```
authStore.ts
gamificationStore.ts
networkStore.ts
playerStore.ts
```

---

## Feature Gap Summary

### Core Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| **Authentication** |
| Email Login | ✅ | ✅ | - | Complete |
| Email Register | ✅ | ✅ | - | Complete |
| OAuth (Google/Spotify/Apple) | ✅ | ❌ | P1 | Post-launch |
| Forgot Password | ✅ | ❌ | P2 | Add later |
| 2FA | ✅ | ❌ | P3 | Post-launch |
| **Music Playback** |
| Stream Tracks | ✅ | ✅ | - | Complete |
| Background Playback | ✅ | ✅ | - | Complete |
| Track Detail | ✅ | ✅ | - | Complete |
| Artist Detail | ✅ | ✅ | - | Complete |
| Playlist Detail | ✅ | ✅ | - | Complete |
| Full Player Screen | ✅ | ✅ | - | Complete |
| Mini Player | ✅ | ✅ | - | Complete |
| Queue Management | ✅ | ✅ | - | Complete |
| **Discovery** |
| Discover Feed | ✅ | ✅ | - | Complete |
| Search | ✅ | ✅ | - | Complete |
| Trending | ✅ | ❌ | P2 | Add later |
| Radio | ✅ | ❌ | P3 | Post-launch |
| **Library** |
| Playlists | ✅ | ✅ | - | Complete |
| Liked Tracks | ✅ | ✅ | - | Complete |
| History | ✅ | ✅ | - | Complete |
| Following | ✅ | ❌ | P2 | Add later |
| **Subscriptions** |
| View Plans | ✅ | ✅ | - | Complete |
| Stripe Checkout | ✅ | ✅ | - | Complete |
| Manage Subscription | ✅ | ✅ | - | Complete |

### Gamification Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| XP/Level Display | ✅ | ✅ | - | In profile |
| Quests | ✅ | ❌ | P1 | High value |
| Badges | ✅ | ❌ | P1 | High value |
| Challenges | ✅ | ❌ | P2 | Medium value |
| Goals | ✅ | ❌ | P2 | Medium value |
| Leaderboard | ✅ | ❌ | P2 | Medium value |
| Achievements | ✅ | ❌ | P2 | Medium value |
| Tiers/Levels | ✅ | ❌ | P2 | Medium value |
| Rewards | ✅ | ❌ | P2 | Medium value |

### Monetization Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| XP Boosters | ✅ | ❌ | P2 | Store feature |
| Season Pass | ✅ | ❌ | P2 | Store feature |
| Sync Licensing | ✅ | ❌ | P3 | Artist feature |
| Marketplace | ✅ | ❌ | P3 | Artist feature |
| Promotions | ✅ | ❌ | P3 | Artist feature |
| Metadata Editor | ✅ | ❌ | P3 | Artist feature |

### Earnings & Analytics

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Dividends View | ✅ | ✅ | - | Complete |
| Taste Evolution | ✅ | ✅ | - | Complete |
| Earnings Dashboard | ✅ | ❌ | P1 | Artist need |
| Artist Studio | ✅ | ✅ | - | Basic version |
| Upload Tracks | ✅ | ❌ | P2 | Web-only OK |

### Social Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Community Feed | ✅ | ✅ | - | Basic version |
| Discussions | ✅ | ❌ | P3 | Post-launch |
| Social Page | ✅ | ❌ | P3 | Post-launch |

### Admin Features

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Admin Dashboard | ✅ | ❌ | - | Web-only |
| Moderation | ✅ | ❌ | - | Web-only |
| Fraud Detection | ✅ | ❌ | - | Web-only |
| All Admin Tools | ✅ | ❌ | - | Web-only (OK) |

### Settings & Legal

| Feature | Web | Mobile | Priority | Notes |
|---------|-----|--------|----------|-------|
| Settings | ✅ | ✅ | - | Basic |
| Legal/Terms | ✅ | ✅ | - | Complete |
| Privacy Policy | ✅ | ✅ | - | Complete |
| Help & Support | ✅ | ✅ | - | Opens URL |
| Billing Settings | ✅ | ✅ | - | Via Stripe |

---

## Priority Breakdown

### P0 - Launch Blockers (None)
All launch-critical features are implemented.

### P1 - High Priority (Post-Launch Sprint 1)
| Feature | Effort | Impact |
|---------|--------|--------|
| Quests | Medium | High engagement |
| Badges | Medium | High engagement |
| Earnings Dashboard | Medium | Artist retention |
| OAuth Login | High | User acquisition |

### P2 - Medium Priority (Post-Launch Sprint 2-3)
| Feature | Effort | Impact |
|---------|--------|--------|
| Challenges | Medium | Engagement |
| Leaderboard | Low | Social proof |
| XP Boosters | Medium | Revenue |
| Season Pass | High | Revenue |
| Trending | Low | Discovery |
| Following | Low | Social |
| Forgot Password | Low | UX |

### P3 - Low Priority (Future)
| Feature | Effort | Impact |
|---------|--------|--------|
| Sync Licensing | High | Niche revenue |
| Marketplace | High | Niche revenue |
| Promotions | High | Artist tools |
| Radio | High | Engagement |
| 2FA | Medium | Security |
| Discussions | Medium | Community |

---

## Missing API Services for Mobile

To reach feature parity, mobile needs these API service modules:

1. **gamification.service.ts** - Quests, badges, challenges, goals
2. **leaderboard.service.ts** - Rankings and competition
3. **boosters.service.ts** - XP booster purchases
4. **seasonPass.service.ts** - Season pass progression
5. **artists.service.ts** - Full artist API (earnings, analytics)
6. **dividends.service.ts** - Dividend history and calculations

---

## Recommendations

### For TestFlight Launch
The app is **ready for TestFlight** with current features:
- ✅ Core streaming works
- ✅ Auth (email) works
- ✅ Subscriptions work
- ✅ Library management works
- ✅ Basic gamification (XP display) works

### Post-Launch Priorities
1. **Week 1-2**: Add Quests and Badges screens
2. **Week 3-4**: Add Earnings Dashboard for artists
3. **Month 2**: OAuth login, Challenges, Leaderboard
4. **Month 3**: XP Boosters, Season Pass store

### Web-Only Features (OK to Skip)
- Admin tools (security risk on mobile)
- Metadata editor (complex UI)
- Track upload (large files)
- Sync licensing (niche B2B)

---

## Changelog

### January 30, 2026 - Bug Fixes & UI Polish

**Bug Fixes (10 items):**

| Issue | Fix | Files Changed |
|-------|-----|---------------|
| App accessible without auth | Added auth redirect in tab layout | `app/(tabs)/_layout.tsx` |
| Profile upload count inaccurate | Use `getArtistTracks(user.id)` with response normalization | `app/(tabs)/profile.tsx` |
| Artist Studio "failed to fetch tracks" | Use `getArtistTracks(user.id)` directly with `useFocusEffect` | `app/artist/studio.tsx` |
| Journey "failed to fetch leaderboards" | Silenced error, updated empty state text | `app/journey/index.tsx` |
| Milestones shows "No badges available" | Changed to "Milestones coming soon" | `app/journey/index.tsx` |
| Community shows "Leaderboard coming soon" | Changed to "Community coming soon" | `app/journey/index.tsx` |
| Player shows hourglass during playback | Only show buffering when `position < 1` | `hooks/useTrackProgress.ts` |
| "View Artist" button broken | Added proper navigation with modal close | `app/player.tsx` |
| Artist earnings showing $0.00 | Normalize API field names (`total_revenue` → `total_earnings`) | `app/(tabs)/profile.tsx`, `types/index.ts` |
| Dashboard response wrapper | Handle both `{stats: {...}}` and direct `{...}` responses | `app/(tabs)/profile.tsx` |

**UI/Branding Updates:**

| Change | Description | Files Changed |
|--------|-------------|---------------|
| Login page image | Changed from logo.png to icon.png with "Palletium" title | `app/(auth)/login.tsx` |
| Header style consistency | Library & Community headers now match Discover style | `app/(tabs)/library.tsx`, `app/(tabs)/community.tsx` |
| Community → Journey tab | Replaced Community tab with Journey (tier/level progress) | `app/(tabs)/_layout.tsx`, `app/(tabs)/journey.tsx` |

**Header Style Standard:**
All tab pages now use consistent header styling:
- Large title: `fontSize.xxxl`, `fontWeight.bold`
- Subtitle: `fontSize.md`, `textSecondary` color
- Padding: `theme.spacing.lg` with `paddingBottom: theme.spacing.md`
- No border/banner

**API Field Normalization:**
The mobile app now normalizes API field names to handle differences between web and mobile expectations:
| API Field | Mobile Field | Description |
|-----------|--------------|-------------|
| `total_revenue` | `total_earnings` | Artist earnings |
| `pending_revenue` | `pending_earnings` | Pending artist earnings |
| `total_tracks` | `track_count` | Number of tracks |
| `{stats: {...}}` | `{...}` | Dashboard response unwrapping |

**Files Changed Summary:**
- `app/(tabs)/_layout.tsx` - Auth guard redirect, Community→Journey tab swap
- `app/(tabs)/profile.tsx` - Track count fetching, earnings normalization, dashboard response handling
- `app/(tabs)/library.tsx` - Header style update
- `app/(tabs)/community.tsx` - Header style update (now hidden)
- `app/(tabs)/journey.tsx` - **NEW** Journey tab with tier/level progress
- `app/(tabs)/index.tsx` - Discover page with Mood Radio and search
- `app/(auth)/login.tsx` - Branding update (icon.png + "Palletium" title)
- `app/journey/index.tsx` - Terminology fixes (badges→milestones, leaderboard→community)
- `app/player.tsx` - View Artist navigation fix
- `app/artist/studio.tsx` - Use `getArtistTracks(user.id)` with `useFocusEffect`
- `hooks/useTrackProgress.ts` - Buffering state fix
- `lib/api/client.ts` - Added logging, `getArtistTracks` improvements
- `types/index.ts` - Added alternative API field names to `DashboardStats`
