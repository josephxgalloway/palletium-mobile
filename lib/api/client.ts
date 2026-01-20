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

export default api;
