export interface User {
  id: number;
  email: string;
  name: string;
  type: 'artist' | 'listener' | 'admin';
  tier_id: number;
  level: number;
  total_xp: number;
  subscription_status: string | null;
  subscription_tier: string | null;
  stripe_subscription_status?: string | null;
  profile_image: string | null;
  profile_image_url?: string | null;
  created_at: string;
  is_admin?: boolean;
  /** Artist identity verification via Stripe Identity (backend field: isVerified) */
  isVerified?: boolean;
}

export interface Track {
  id: number;
  title: string;
  artist_name: string;
  artist_id: number;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number;
  play_count: number;
  genre: string | null;
  review_status: string;
  // API may return these alternative field names
  artist_name_full?: string;
  cover_art_url?: string;
  duration?: number | null;
  album?: string;
}

// Helper to get display artist name (API returns empty artist_name but populated artist_name_full)
export function getArtistName(track: Track): string {
  return track.artist_name_full || track.artist_name || 'Unknown Artist';
}

// Helper to get cover image URL (API uses cover_art_url)
export function getCoverUrl(track: Track): string | null {
  return track.cover_art_url || track.cover_url || null;
}

// Helper to get duration in seconds (API uses duration which may be null)
export function getDuration(track: Track): number {
  return track.duration_seconds || track.duration || 0;
}

export interface DashboardData {
  totalEarnings: number;
  totalDividends: number;
  totalXP: number;
  currentTier: string;
  discoveryCount: number;
  playCount: number;
  level: number;
  subscriptionStatus: string | null;
}

export interface PlayRecord {
  track_id: number;
  listen_duration: number;
  is_complete: boolean;
}

export interface DashboardStats {
  // Listener stats
  total_rewards?: number;
  pending_rewards?: number;
  discovery_count?: number;
  play_count?: number;
  current_tier?: string;
  tier_progress?: number;
  total_xp?: number;

  // Artist stats (API may use different field names)
  total_earnings?: number;    // normalized from total_revenue
  pending_earnings?: number;  // normalized from pending_revenue
  total_revenue?: number;     // original API field
  pending_revenue?: number;   // original API field
  monthly_revenue?: number;
  total_plays?: number;
  unique_listeners?: number;
  track_count?: number;       // normalized from total_tracks
  total_tracks?: number;      // original API field
  current_level?: number;
  level_progress?: number;
}

export interface RecentPlay {
  id: number;
  track: Track;
  played_at: string;
  is_first_listen: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  cover_url?: string;
  track_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Extended fields when fetching single playlist
  creator_id?: number;
  creator_name?: string;
  tracks?: Track[];
  total_duration?: number;
  is_owner?: boolean;
}

export interface Artist {
  id: number;
  name: string;
  handle?: string;
  bio?: string;
  profile_image_url?: string;
  follower_count: number;
  total_plays: number;
  level: number;
  tier?: string;
  track_count?: number;
  total_earnings?: number;
  is_following?: boolean;
}

export interface TrackInteraction {
  has_listened: boolean;
  first_listen_date?: string;
  play_count: number;
  is_liked?: boolean;
}
