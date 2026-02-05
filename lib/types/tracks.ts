// Track metadata types for the mobile app

export interface Contributor {
  id?: string;
  user_id?: string;
  name: string;
  role: 'composer' | 'lyricist' | 'producer' | 'performer' | 'featured';
  split_percentage: number;
  ipi?: string;
  isni?: string;
}

export interface TrackMetadata {
  id: number;
  title: string;
  description?: string;
  genre?: string;
  sub_genre?: string;
  mood?: string;
  tags: string[];
  artist_name: string;
  artist_id: number;
  audio_url: string;
  artwork_url?: string;
  cover_art_url?: string;
  duration_seconds: number;
  isrc?: string;
  release_date?: string;
  contributors: Contributor[];
  play_count: number;
  review_status: 'pending' | 'approved' | 'rejected';
  is_public: boolean;
  is_ai_generated?: boolean;
  created_at: string;
  updated_at: string;
  // Content type info
  content_type?: 'original' | 'contains_samples' | 'cover' | 'remix';
  original_artist?: string;
  original_track?: string;
}

export interface TrackMetadataUpdate {
  title?: string;
  description?: string;
  genre?: string;
  sub_genre?: string;
  mood?: string;
  tags?: string[];
  artist_name?: string;
  contributors?: Contributor[];
}

export interface MetadataHistoryEntry {
  id: string;
  track_id: number;
  field_name: string;
  old_value: any;
  new_value: any;
  changed_by: number;
  created_at: string;
}

export const CONTRIBUTOR_ROLES: { value: Contributor['role']; label: string }[] = [
  { value: 'composer', label: 'Composer' },
  { value: 'lyricist', label: 'Lyricist' },
  { value: 'producer', label: 'Producer' },
  { value: 'performer', label: 'Performer' },
  { value: 'featured', label: 'Featured Artist' },
];

export const GENRES = [
  'Electronic',
  'Hip-Hop',
  'R&B',
  'Pop',
  'Rock',
  'Indie',
  'Jazz',
  'Classical',
  'Country',
  'Folk',
  'Metal',
  'Punk',
  'Reggae',
  'Latin',
  'World',
  'Ambient',
  'Experimental',
  'Soul',
  'Blues',
  'Funk',
] as const;

export const MOODS = [
  'Energetic',
  'Chill',
  'Happy',
  'Sad',
  'Romantic',
  'Aggressive',
  'Peaceful',
  'Melancholic',
  'Uplifting',
  'Dark',
  'Dreamy',
  'Intense',
  'Relaxed',
  'Motivational',
  'Nostalgic',
] as const;

// Validation constants
export const VALIDATION = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ARTIST_NAME_MAX_LENGTH: 100,
  TAG_MAX_LENGTH: 30,
  MAX_TAGS: 10,
} as const;
