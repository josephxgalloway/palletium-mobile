// Feature visibility based on platform-wide user count
// Thresholds are checked against total registered users

export interface FeatureGate {
  key: string;
  name: string;
  requiredUsers: number;
  requiredTracks?: number;
  requiredArtists?: number;
  additionalConditions?: string;
  status: 'active' | 'preview' | 'hidden';
}

export const FEATURE_GATES: FeatureGate[] = [
  // ALWAYS ACTIVE - Core Value
  { key: 'streaming', name: 'Music Streaming', requiredUsers: 0, status: 'active' },
  { key: 'payments', name: 'Artist Payments', requiredUsers: 0, status: 'active' },
  { key: 'dividends', name: 'Listener Dividends', requiredUsers: 0, status: 'active' },
  { key: 'listener_subscription', name: 'Listener Subscriptions', requiredUsers: 0, status: 'active' },
  { key: 'artist_subscription', name: 'Artist Pro Subscription', requiredUsers: 0, status: 'active' },
  { key: 'artist_profile', name: 'Artist Social Profile', requiredUsers: 0, status: 'active' },
  { key: 'library', name: 'Library & Playlists', requiredUsers: 0, status: 'active' },
  { key: 'upload', name: 'Track Upload', requiredUsers: 0, status: 'active' },
  { key: 'earnings_dashboard', name: 'Earnings Dashboard', requiredUsers: 0, status: 'active' },
  { key: 'metadata_editor', name: 'Metadata Editor', requiredUsers: 0, status: 'active' },

  // PREVIEW AT 100 USERS - Social Features
  { key: 'leaderboards', name: 'Leaderboards', requiredUsers: 100, status: 'preview' },
  { key: 'community_feed', name: 'Community Feed', requiredUsers: 100, status: 'preview' },
  { key: 'quests', name: 'Quests & Challenges', requiredUsers: 100, status: 'preview' },
  { key: 'badges', name: 'Badges', requiredUsers: 100, status: 'preview' },

  // UNLOCK THRESHOLDS - Paid Features Requiring Network
  {
    key: 'sync_licensing',
    name: 'Sync Licensing',
    requiredUsers: 0,
    requiredTracks: 500,
    additionalConditions: '5 active buyer conversations',
    status: 'preview'
  },
  {
    key: 'promotions',
    name: 'Promotional Tools',
    requiredUsers: 1000,
    status: 'preview'
  },
  {
    key: 'season_pass',
    name: 'Season Pass',
    requiredUsers: 500,
    status: 'preview'
  },
  {
    key: 'xp_boosters',
    name: 'XP Boosters',
    requiredUsers: 100,
    additionalConditions: 'Leaderboards active',
    status: 'preview'
  },
  {
    key: 'marketplace',
    name: 'Artist Marketplace',
    requiredArtists: 100,
    requiredUsers: 0,
    status: 'preview'
  },
  {
    key: 'hire_artist',
    name: 'Hire Artist',
    requiredArtists: 100,
    requiredUsers: 0,
    status: 'hidden'
  },
];

export const UNLOCK_THRESHOLDS = {
  socialFeatures: 100,        // users
  syncLicensing: 500,         // quality tracks + buyer conversations
  promotions: 1000,           // MAU
  seasonPass: 500,            // active users
  xpBoosters: 100,            // users (requires leaderboards)
  marketplace: 100,           // artists
};
