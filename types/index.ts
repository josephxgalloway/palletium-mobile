export interface User {
  id: number;
  email: string;
  name: string;
  type: 'artist' | 'listener';
  tier_id: number;
  level: number;
  total_xp: number;
  subscription_status: string | null;
  subscription_tier: string | null;
  profile_image: string | null;
  created_at: string;
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

  // Artist stats
  total_earnings?: number;
  pending_earnings?: number;
  total_plays?: number;
  unique_listeners?: number;
  track_count?: number;
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
}
