import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://palletium.com/api';
console.log('API_URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
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

// Artist Studio
export const getMyTracks = async () => {
  const response = await api.get('/tracks/my');
  return response.data;
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
  const response = await api.get(`/artists/${id}/tracks?limit=${limit}`);
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
