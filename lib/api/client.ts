import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * API base URL — sourced from EXPO_PUBLIC_API_URL (set per build profile in eas.json).
 *   production / preview: https://api.palletium.com
 *   development:          http://localhost:3001
 * The env var is the origin; we append /api so route paths stay relative (/auth/login, /tracks, etc.).
 */
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
if (!API_ORIGIN) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Define it in eas.json (build profiles) or .env for local dev.'
  );
}
// Append /api unless the env var already includes it (prevents /api/api)
const API_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

if (__DEV__) {
  console.log('[api/client] API_URL:', API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000, // 30s — covers profile image upload + slow LTE
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Failed to get token:', error);
  }
  return config;
});

// --- Single-flight refresh dedup (D-02) ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// Response interceptor - handle token refresh with single-flight dedup
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in flight, queue this request and wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest._retry = true;
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Raw axios to avoid interceptor recursion
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        // Resolve all queued requests with the new token
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Reject all queued requests
        processQueue(refreshError, null);

        // D-03: Hard logout — clear tokens and reset Zustand auth state.
        // Lazy require breaks the circular dependency (authStore imports client).
        try {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        } catch {}
        try {
          const { useAuthStore } = require('../store/authStore');
          useAuthStore.getState().clearLocalAuthState();
        } catch {}

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const getDividendSummary = async () => {
  const response = await api.get('/listener/dividends/summary');
  return response.data;
};

export const getDividendHistory = async (page = 1, limit = 20) => {
  const response = await api.get(`/listener/dividends/history?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCommunityPosts = async (limit = 20) => {
  const response = await api.get(`/gamification/community/posts?limit=${limit}`);
  return response.data;
};

export const createCommunityPost = async (content: string, type = 'general') => {
  const response = await api.post('/gamification/community/posts', { content, post_type: type });
  return response.data;
};

export const getTasteEvolution = async (months = 6) => {
  const response = await api.get(`/analytics/taste-evolution?months=${months}`);
  return response.data;
};

// Subscriptions
export const getSubscriptionStatus = async () => {
  const response = await api.get('/subscriptions/status');
  return response.data;
};

export const createSubscriptionSession = async (interval: 'month' | 'year' = 'month') => {
  const response = await api.post('/subscriptions/listener', {
    tier: 'premium',
    interval
  });
  return response.data;
};

// Artist Studio - Get current user's tracks
export const getMyTracks = async () => {
  try {
    // Try the /tracks/my endpoint first
    console.log('getMyTracks: Trying /tracks/my');
    const response = await api.get('/tracks/my');
    console.log('getMyTracks: /tracks/my response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.log('getMyTracks: /tracks/my failed with status:', error.response?.status);
    // If endpoint doesn't exist (404) or server error, fall back to /artists/:id/tracks
    if (error.response?.status === 404 || error.response?.status === 500) {
      try {
        // Get user info to get their artist ID
        console.log('getMyTracks: Trying fallback via /auth/me');
        const meResponse = await api.get('/auth/me');
        const userId = meResponse.data?.user?.id || meResponse.data?.id;
        console.log('getMyTracks: Got user ID:', userId);
        if (userId) {
          const tracksResponse = await api.get(`/artists/${userId}/tracks`);
          console.log('getMyTracks: /artists/:id/tracks response:', JSON.stringify(tracksResponse.data, null, 2));
          return tracksResponse.data;
        }
      } catch (fallbackError) {
        console.error('getMyTracks: Fallback tracks fetch failed:', fallbackError);
      }
    }
    throw error;
  }
};

export const updateTrack = async (id: number, data: { title?: string, genre?: string, is_public?: boolean }) => {
  const response = await api.put(`/tracks/${id}`, data);
  return response.data;
};

// Track Detail
export const getTrack = async (id: number) => {
  const response = await api.get(`/tracks/${id}`);
  return response.data;
};

export const getTrackInteraction = async (trackId: number) => {
  const response = await api.get(`/users/me/interactions/${trackId}`);
  return response.data;
};

export const likeTrack = async (trackId: number) => {
  const response = await api.post(`/tracks/${trackId}/like`);
  return response.data;
};

export const unlikeTrack = async (trackId: number) => {
  const response = await api.delete(`/tracks/${trackId}/like`);
  return response.data;
};

export const getLikedTracks = async (limit = 50) => {
  const response = await api.get(`/users/me/liked-tracks?limit=${limit}`);
  return response.data;
};

// Artist
export const getArtist = async (id: number) => {
  const response = await api.get(`/artists/${id}`);
  return response.data;
};

export const getArtistTracks = async (id: number, limit = 50) => {
  console.log('getArtistTracks: Fetching tracks for artist ID:', id);
  const response = await api.get(`/artists/${id}/tracks?limit=${limit}`);
  console.log('getArtistTracks: Response:', JSON.stringify(response.data, null, 2));
  return response.data;
};

export const followArtist = async (id: number) => {
  const response = await api.post(`/artists/${id}/follow`);
  return response.data;
};

export const unfollowArtist = async (id: number) => {
  const response = await api.delete(`/artists/${id}/follow`);
  return response.data;
};

// Playlist Detail
export const getPlaylist = async (id: number) => {
  const response = await api.get(`/playlists/${id}`);
  return response.data;
};

export const getUserPlaylists = async () => {
  const response = await api.get('/playlists');
  return response.data;
};

export const addTrackToPlaylist = async (playlistId: number, trackId: number) => {
  const response = await api.post(`/playlists/${playlistId}/tracks`, { track_id: trackId });
  return response.data;
};

export const removeTrackFromPlaylist = async (playlistId: number, trackId: number) => {
  const response = await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  return response.data;
};

export const reorderPlaylistTracks = async (playlistId: number, trackIds: number[]) => {
  const response = await api.put(`/playlists/${playlistId}/tracks`, { track_ids: trackIds });
  return response.data;
};

export const updatePlaylist = async (id: number, data: { name?: string, description?: string, is_public?: boolean }) => {
  const response = await api.put(`/playlists/${id}`, data);
  return response.data;
};

export default api;
