import { api } from './client';
import type { TrackMetadata, TrackMetadataUpdate, MetadataHistoryEntry } from '../types/tracks';

export const tracksApi = {
  /**
   * Get track with full metadata
   */
  getTrack: async (id: number | string): Promise<TrackMetadata> => {
    const response = await api.get(`/tracks/${id}`);
    const data = response.data;
    // Handle nested response format
    return data.track || data;
  },

  /**
   * Update track metadata
   */
  updateMetadata: async (id: number | string, data: TrackMetadataUpdate): Promise<TrackMetadata> => {
    const response = await api.patch(`/tracks/${id}/metadata`, data);
    return response.data.track || response.data;
  },

  /**
   * Get metadata edit history for a track
   */
  getMetadataHistory: async (id: number | string): Promise<MetadataHistoryEntry[]> => {
    try {
      const response = await api.get(`/tracks/${id}/metadata-history`);
      return response.data.history || response.data || [];
    } catch (error: any) {
      // History endpoint may not exist - return empty array
      console.log('Metadata history not available:', error.response?.status);
      return [];
    }
  },

  /**
   * Get remaining edit count from rate limit headers
   * Returns -1 if rate limiting is not enabled
   */
  getRemainingEdits: async (id: number | string): Promise<number> => {
    try {
      const response = await api.head(`/tracks/${id}/metadata`);
      const remaining = response.headers['x-ratelimit-remaining'];
      return remaining ? parseInt(remaining, 10) : -1;
    } catch (error) {
      // Rate limit info not available
      return -1;
    }
  },

  /**
   * Generate ISRC for a track
   */
  generateISRC: async (id: number | string): Promise<string> => {
    const response = await api.post(`/tracks/${id}/generate-isrc`);
    return response.data.isrc;
  },
};

export default tracksApi;
