import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // 2FA state
  requires2FA: boolean;
  tempToken: string | null;

  login: (email: string, password: string) => Promise<boolean | '2fa'>;
  verify2FA: (code: string) => Promise<boolean>;
  cancel2FA: () => void;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  type: 'artist' | 'listener';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  requires2FA: false,
  tempToken: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null, requires2FA: false, tempToken: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', JSON.stringify(response.data, null, 2));

      const data = response.data;

      // Check if 2FA is required
      if (data.requires2FA && data.tempToken) {
        set({
          requires2FA: true,
          tempToken: data.tempToken,
          isLoading: false
        });
        return '2fa';
      }

      // Handle different response formats
      const accessToken = data.accessToken || data.token || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token || '';
      const user = data.user || data;

      // SecureStore requires strings
      if (accessToken && typeof accessToken === 'string') {
        await SecureStore.setItemAsync('accessToken', accessToken);
      }
      if (refreshToken && typeof refreshToken === 'string') {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }

      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error: any) {
      console.log('Login error:', error.message);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  verify2FA: async (code) => {
    const { tempToken } = get();
    if (!tempToken) {
      set({ error: '2FA session expired. Please login again.' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login/verify-2fa', {
        tempToken,
        token: code
      });

      const data = response.data;
      const accessToken = data.accessToken || data.token || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token || '';
      const user = data.user || data;

      if (accessToken && typeof accessToken === 'string') {
        await SecureStore.setItemAsync('accessToken', accessToken);
      }
      if (refreshToken && typeof refreshToken === 'string') {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
        tempToken: null
      });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Invalid verification code';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  cancel2FA: () => {
    set({ requires2FA: false, tempToken: null, error: null });
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken } = response.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await api.get('/auth/me');
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      try {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      } catch {}
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null,
  })),
}));
