import Toast from 'react-native-toast-message';
import { create } from 'zustand';
import type { DashboardStats } from '../../types';
import api from '../api/client';

interface GamificationState {
    stats: DashboardStats | null;
    previousXP: number;
    isLoading: boolean;

    // Actions
    fetchStats: () => Promise<void>;
    checkForUpdates: () => Promise<void>;
    reset: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
    stats: null,
    previousXP: 0,
    isLoading: false,

    fetchStats: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get('/users/dashboard');
            const newStats = response.data;

            // Update previousXP if it's the first load (to avoid toast on app open)
            const currentStats = get().stats;
            if (!currentStats) {
                set({ previousXP: newStats.total_xp || 0 });
            }

            set({ stats: newStats, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch gamification stats:', error);
            set({ isLoading: false });
        }
    },

    checkForUpdates: async () => {
        const oldStats = get().stats;
        const oldXP = oldStats?.total_xp || 0;

        await get().fetchStats();

        const newStats = get().stats;
        const newXP = newStats?.total_xp || 0;

        // Only show toast if we had previous stats to compare against
        if (oldStats && newXP > oldXP) {
            const difference = newXP - oldXP;

            Toast.show({
                type: 'success',
                text1: 'Level Up!',
                text2: `You earned ${difference} XP!`,
                position: 'bottom',
                visibilityTime: 4000,
                bottomOffset: 140, // Same offset as payment toast
            });
        }
    },

    reset: () => set({ stats: null, previousXP: 0, isLoading: false })
}));
