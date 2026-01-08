import { create } from 'zustand';
import api from '../api/client';
import type { Track } from '../../types';

// Lazy load TrackPlayer - allows app to run in Expo Go without native module
let TrackPlayer: any = null;
let isNativePlayerAvailable = false;

try {
  TrackPlayer = require('react-native-track-player').default;
  isNativePlayerAvailable = true;
} catch (e) {
  console.warn('TrackPlayer not available - running in mock mode (Expo Go)');
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  position: number;
  duration: number;
  playStartTime: number | null;
  hasRecordedPlay: boolean;
  isNativePlayer: boolean;

  // Actions
  playTrack: (track: Track) => Promise<void>;
  addToQueue: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  checkAndRecordPlay: () => Promise<void>;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  playStartTime: null,
  hasRecordedPlay: false,
  isNativePlayer: isNativePlayerAvailable,

  playTrack: async (track) => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        // Real playback with native module
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id.toString(),
          url: track.audio_url,
          title: track.title,
          artist: track.artist_name,
          artwork: track.cover_url || undefined,
          duration: track.duration_seconds,
        });
        await TrackPlayer.play();
      } else {
        // Mock mode - just update UI state
        console.log('[Mock Player] Playing:', track.title);
      }

      set({
        currentTrack: track,
        isPlaying: true,
        playStartTime: Date.now(),
        hasRecordedPlay: false,
        position: 0,
        duration: track.duration_seconds,
      });
    } catch (error) {
      console.error('Failed to play track:', error);
      // Still update UI even if native player fails
      set({
        currentTrack: track,
        isPlaying: false,
        position: 0,
        duration: track.duration_seconds,
      });
    }
  },

  addToQueue: async (track) => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.add({
          id: track.id.toString(),
          url: track.audio_url,
          title: track.title,
          artist: track.artist_name,
          artwork: track.cover_url || undefined,
          duration: track.duration_seconds,
        });
      }
      set((state) => ({ queue: [...state.queue, track] }));
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  },

  pause: async () => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.pause();
      } else {
        console.log('[Mock Player] Paused');
      }
      set({ isPlaying: false });
      get().checkAndRecordPlay();
    } catch (error) {
      console.error('Failed to pause:', error);
      set({ isPlaying: false });
    }
  },

  resume: async () => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.play();
      } else {
        console.log('[Mock Player] Resumed');
      }

      const { hasRecordedPlay, playStartTime } = get();
      if (!hasRecordedPlay && !playStartTime) {
        set({ playStartTime: Date.now() });
      }

      set({ isPlaying: true });
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  },

  stop: async () => {
    try {
      await get().checkAndRecordPlay();

      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      }

      set({
        currentTrack: null,
        isPlaying: false,
        position: 0,
        playStartTime: null,
        hasRecordedPlay: false,
      });
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  },

  skipNext: async () => {
    try {
      await get().checkAndRecordPlay();

      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.skipToNext();
      }

      set({
        playStartTime: Date.now(),
        hasRecordedPlay: false,
      });
    } catch (error) {
      console.error('Failed to skip next:', error);
    }
  },

  skipPrevious: async () => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.skipToPrevious();
      }

      set({
        playStartTime: Date.now(),
        hasRecordedPlay: false,
      });
    } catch (error) {
      console.error('Failed to skip previous:', error);
    }
  },

  seekTo: async (position) => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.seekTo(position);
      }
      set({ position });
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  },

  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  // Critical: Record play after 30 seconds
  checkAndRecordPlay: async () => {
    const { currentTrack, playStartTime, hasRecordedPlay, position, duration } = get();

    if (hasRecordedPlay || !currentTrack || !playStartTime) {
      return;
    }

    const listenDuration = Date.now() - playStartTime;

    if (listenDuration < 30000) {
      return;
    }

    try {
      // Get user_id from auth store
      const { useAuthStore } = await import('./authStore');
      const user = useAuthStore.getState().user;

      if (!user) {
        console.log('No user logged in, skipping play record');
        return;
      }

      // Check network before recording
      const { useNetworkStore } = await import('./networkStore');
      const isConnected = useNetworkStore.getState().isConnected;

      if (!isConnected) {
        console.log('Offline, skipping play record');
        return;
      }

      const payload = {
        track_id: Number(currentTrack.id),  // Ensure integer
        user_id: user.id,                    // Backend requires this
        listen_duration: listenDuration,
        is_complete: position >= duration - 5,
      };

      console.log('Recording play payload:', JSON.stringify(payload));

      const response = await api.post('/plays/record', payload);
      console.log('Play recorded:', response.data);

      set({ hasRecordedPlay: true });

      // Show payment toast
      const Toast = (await import('react-native-toast-message')).default;
      const payment = response.data.payment;

      if (payment) {
        const isFirstListen = response.data.is_first_listen;
        Toast.show({
          type: 'payment',
          text1: isFirstListen ? 'First Listen!' : 'Play Recorded',
          text2: `Artist earned $${payment.artistPayment?.toFixed(2) || '1.00'}`,
          position: 'bottom',
          visibilityTime: 3000,
          bottomOffset: 140, // Above mini player
        });
      }
    } catch (error: any) {
      console.log('Record play error response:', JSON.stringify(error.response?.data));
      console.error('Failed to record play:', error);
    }
  },

  reset: () => set({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    position: 0,
    duration: 0,
    playStartTime: null,
    hasRecordedPlay: false,
  }),
}));
