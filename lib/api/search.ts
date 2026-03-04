import type { Track } from '@/types';
import api from './client';

export type SearchType = 'all' | 'tracks' | 'artists' | 'playlists';

export interface SearchArtist {
  id: number;
  name: string;
  profileImageUrl?: string | null;
  followerCount?: number;
  trackCount?: number;
  isVerified?: boolean;
}

export interface SearchPlaylist {
  id: number;
  name: string;
  description?: string;
  coverUrl?: string | null;
  trackCount?: number;
  creatorName?: string;
}

export interface UnifiedSearchResults {
  query: string;
  type: SearchType;
  results: {
    tracks: Track[];
    artists: SearchArtist[];
    playlists: SearchPlaylist[];
  };
  counts: {
    tracks: number;
    artists: number;
    playlists: number;
    total: number;
  };
  fallback: boolean;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTrack(raw: any): Track {
  return {
    id: toNumber(raw?.id),
    title: raw?.title || 'Untitled Track',
    artist_name: raw?.artist_name || raw?.artistName || raw?.artist_name_full || 'Unknown Artist',
    artist_id: toNumber(raw?.artist_id ?? raw?.artistId),
    audio_url: raw?.audio_url || raw?.audioUrl || '',
    cover_url: raw?.cover_url || raw?.cover_art_url || raw?.coverArtUrl || raw?.artwork_url || null,
    duration_seconds: toNumber(raw?.duration_seconds ?? raw?.duration),
    play_count: toNumber(raw?.play_count ?? raw?.plays),
    genre: raw?.genre || null,
    review_status: raw?.review_status || 'approved',
    artist_name_full: raw?.artist_name_full || raw?.artistName,
    cover_art_url: raw?.cover_art_url || raw?.coverArtUrl,
    coverArtUrl: raw?.coverArtUrl,
    artwork_url: raw?.artwork_url,
    duration: toNumber(raw?.duration ?? raw?.duration_seconds),
    plays: toNumber(raw?.plays ?? raw?.play_count),
    album: raw?.album,
  };
}

function normalizeArtist(raw: any): SearchArtist {
  return {
    id: toNumber(raw?.id ?? raw?.artist_id),
    name: raw?.name || raw?.artist_name || raw?.display_name || 'Unknown Artist',
    profileImageUrl: raw?.profile_image_url || raw?.profileImageUrl || raw?.avatar_url || null,
    followerCount: toNumber(raw?.follower_count ?? raw?.followers_count),
    trackCount: toNumber(raw?.track_count),
    isVerified: !!(raw?.is_verified ?? raw?.isVerified),
  };
}

function normalizePlaylist(raw: any): SearchPlaylist {
  return {
    id: toNumber(raw?.id ?? raw?.playlist_id),
    name: raw?.name || 'Untitled Playlist',
    description: raw?.description || '',
    coverUrl: raw?.cover_image_url || raw?.cover_url || raw?.coverUrl || null,
    trackCount: toNumber(raw?.track_count),
    creatorName: raw?.creator_name || raw?.owner_name,
  };
}

function filterFallbackTracks(allTracks: any[], query: string, limit: number): Track[] {
  const term = query.trim().toLowerCase();
  return allTracks
    .filter((track) => {
      const title = String(track?.title || '').toLowerCase();
      const artist = String(track?.artist_name || track?.artist_name_full || track?.artistName || '').toLowerCase();
      return title.includes(term) || artist.includes(term);
    })
    .slice(0, limit)
    .map(normalizeTrack);
}

export async function unifiedSearch(
  query: string,
  options?: {
    type?: SearchType;
    limit?: number;
    offset?: number;
  }
): Promise<UnifiedSearchResults> {
  const searchQuery = query.trim();
  const type = options?.type || 'all';
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  if (searchQuery.length < 2) {
    return {
      query: searchQuery,
      type,
      results: { tracks: [], artists: [], playlists: [] },
      counts: { tracks: 0, artists: 0, playlists: 0, total: 0 },
      fallback: false,
    };
  }

  try {
    const response = await api.get('/discovery/search', {
      params: {
        q: searchQuery,
        type,
        limit,
        offset,
      },
    });

    const data = response.data || {};
    const rawResults = data.results || {};

    const tracks = Array.isArray(rawResults.tracks) ? rawResults.tracks.map(normalizeTrack) : [];
    const artists = Array.isArray(rawResults.artists) ? rawResults.artists.map(normalizeArtist) : [];
    const playlists = Array.isArray(rawResults.playlists)
      ? rawResults.playlists.map(normalizePlaylist)
      : [];

    const counts = {
      tracks: toNumber(data?.counts?.tracks, tracks.length),
      artists: toNumber(data?.counts?.artists, artists.length),
      playlists: toNumber(data?.counts?.playlists, playlists.length),
      total: toNumber(data?.counts?.total, tracks.length + artists.length + playlists.length),
    };

    return {
      query: data.query || searchQuery,
      type: (data.type as SearchType) || type,
      results: { tracks, artists, playlists },
      counts,
      fallback: false,
    };
  } catch (primaryError) {
    // Fallback for offline / unavailable unified endpoint: track-only search via discovery feed.
    const fallbackResponse = await api.get('/discovery/');
    const allTracks = fallbackResponse.data?.tracks || fallbackResponse.data || [];
    const tracks = Array.isArray(allTracks)
      ? filterFallbackTracks(allTracks, searchQuery, limit)
      : [];

    return {
      query: searchQuery,
      type: 'tracks',
      results: { tracks, artists: [], playlists: [] },
      counts: {
        tracks: tracks.length,
        artists: 0,
        playlists: 0,
        total: tracks.length,
      },
      fallback: true,
    };
  }
}
