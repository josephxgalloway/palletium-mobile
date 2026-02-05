import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { Track } from '../../types';
import { getArtistName, getCoverUrl, getDuration } from '../../types';
import api from '../api/client';

// Lazy load TrackPlayer - allows app to run in Expo Go without native module
let TrackPlayer: any = null;
let isNativePlayerAvailable = false;

try {
  TrackPlayer = require('react-native-track-player').default;
  isNativePlayerAvailable = true;
} catch (e) {
  console.warn('TrackPlayer not available - running in mock mode (Expo Go)');
}

// Preview mode constants
const PREVIEW_DURATION = 15; // seconds
const FADE_DURATION = 3; // seconds for fade out
const MAX_FREE_PREVIEWS = 3;
const PREVIEW_START_OFFSET = 30; // Start 30s into track to catch the hook

const PREVIEW_COUNT_KEY = 'palletium_preview_count';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  position: number;
  duration: number;
  playStartTime: number | null;
  hasRecordedPlay: boolean;
  isNativePlayer: boolean;

  // Preview mode state
  isPreviewMode: boolean;
  previewCount: number;
  showSignupPrompt: boolean;
  previewEndTime: number | null;
  isFadingOut: boolean;

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
  checkPreviewEnd: () => Promise<void>;
  dismissSignupPrompt: () => void;
  loadPreviewCount: () => Promise<void>;
  reset: () => void;
}

// Fade out helper - uses 30 steps over 3 seconds for smooth transition
async function fadeOutVolume(): Promise<void> {
  if (!isNativePlayerAvailable || !TrackPlayer) return;

  const steps = 30; // More steps = smoother fade
  const stepDuration = (FADE_DURATION * 1000) / steps; // 100ms per step

  for (let i = steps; i >= 0; i--) {
    // Use exponential curve for more natural fade perception
    const volume = Math.pow(i / steps, 2);
    try {
      await TrackPlayer.setVolume(volume);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    } catch (e) {
      break;
    }
  }
}

// Reset volume helper
async function resetVolume(): Promise<void> {
  if (!isNativePlayerAvailable || !TrackPlayer) return;
  try {
    await TrackPlayer.setVolume(1.0);
  } catch (e) {
    // Ignore
  }
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

  // Preview mode state
  isPreviewMode: false,
  previewCount: 0,
  showSignupPrompt: false,
  previewEndTime: null,
  isFadingOut: false,

  loadPreviewCount: async () => {
    try {
      const stored = await SecureStore.getItemAsync(PREVIEW_COUNT_KEY);
      if (stored) {
        set({ previewCount: parseInt(stored, 10) });
      }
    } catch (e) {
      console.warn('Failed to load preview count:', e);
    }
  },

  playTrack: async (track) => {
    try {
      // Check authentication status
      const { useAuthStore } = await import('./authStore');
      const user = useAuthStore.getState().user;
      const isAuthenticated = !!user;

      const artistName = getArtistName(track);
      const coverUrl = getCoverUrl(track);
      const trackDuration = getDuration(track);

      // Reset volume in case previous preview faded out
      await resetVolume();

      // Determine if preview mode
      const isPreview = !isAuthenticated;
      let startPosition = 0;
      let effectiveDuration = trackDuration;

      if (isPreview) {
        // Check preview count - show signup prompt if exceeded
        const currentCount = get().previewCount;
        if (currentCount >= MAX_FREE_PREVIEWS) {
          set({ showSignupPrompt: true });
          return; // Don't play, show signup instead
        }

        // Calculate preview start position (30s in, or 0 if track is short)
        startPosition = trackDuration > PREVIEW_START_OFFSET + PREVIEW_DURATION
          ? PREVIEW_START_OFFSET
          : 0;

        // Preview is only 15 seconds
        effectiveDuration = PREVIEW_DURATION;

        // Increment preview count
        const newCount = currentCount + 1;
        set({ previewCount: newCount });
        try {
          await SecureStore.setItemAsync(PREVIEW_COUNT_KEY, newCount.toString());
        } catch (e) {
          console.warn('Failed to save preview count:', e);
        }

        console.log(`[Preview Mode] Playing ${PREVIEW_DURATION}s preview (${newCount}/${MAX_FREE_PREVIEWS})`);
      }

      if (isNativePlayerAvailable && TrackPlayer) {
        // Real playback with native module
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id.toString(),
          url: track.audio_url,
          title: track.title,
          artist: artistName,
          artwork: coverUrl || undefined,
          duration: trackDuration,
        });

        // Seek to start position for preview mode
        if (startPosition > 0) {
          await TrackPlayer.seekTo(startPosition);
        }

        await TrackPlayer.play();
      } else {
        // Mock mode - just update UI state
        console.log('[Mock Player] Playing:', track.title, isPreview ? '(PREVIEW)' : '');
      }

      set({
        currentTrack: track,
        isPlaying: true,
        playStartTime: isPreview ? null : Date.now(), // Don't track play time in preview
        hasRecordedPlay: isPreview, // Prevent recording for preview
        position: startPosition,
        duration: trackDuration,
        isPreviewMode: isPreview,
        previewEndTime: isPreview ? Date.now() + (PREVIEW_DURATION * 1000) : null,
      });

      // Show preview count toast
      if (isPreview) {
        const Toast = (await import('react-native-toast-message')).default;
        const remaining = MAX_FREE_PREVIEWS - get().previewCount;
        Toast.show({
          type: 'info',
          text1: '🎵 Preview Mode',
          text2: remaining > 0
            ? `${remaining} free preview${remaining === 1 ? '' : 's'} remaining`
            : 'Sign up for unlimited listening!',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to play track:', error);
      // Still update UI even if native player fails
      set({
        currentTrack: track,
        isPlaying: false,
        position: 0,
        duration: getDuration(track),
        isPreviewMode: false,
      });
    }
  },

  // Check if preview should end (called from progress hook)
  checkPreviewEnd: async () => {
    const { isPreviewMode, previewEndTime, isPlaying, previewCount, isFadingOut } = get();

    // Skip if not in preview mode, already fading, or not playing
    if (!isPreviewMode || !previewEndTime || !isPlaying || isFadingOut) {
      return;
    }

    const now = Date.now();
    const timeUntilEnd = previewEndTime - now;

    // Start fade when we're within FADE_DURATION seconds of the end
    if (timeUntilEnd <= FADE_DURATION * 1000) {
      // Set flag immediately to prevent multiple triggers
      set({ isFadingOut: true });

      console.log('[Preview Mode] Starting fade out...');

      // Fade out gracefully
      await fadeOutAndStop();

      // Check if should show signup prompt
      if (previewCount >= MAX_FREE_PREVIEWS) {
        set({ showSignupPrompt: true });
      }
    }
  },

  addToQueue: async (track) => {
    try {
      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.add({
          id: track.id.toString(),
          url: track.audio_url,
          title: track.title,
          artist: getArtistName(track),
          artwork: getCoverUrl(track) || undefined,
          duration: getDuration(track),
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

      // Only record play if not in preview mode
      if (!get().isPreviewMode) {
        get().checkAndRecordPlay();
      }
    } catch (error) {
      console.error('Failed to pause:', error);
      set({ isPlaying: false });
    }
  },

  resume: async () => {
    try {
      // Check if in preview mode and preview has ended
      const { isPreviewMode, previewEndTime } = get();
      if (isPreviewMode && previewEndTime && Date.now() >= previewEndTime) {
        // Preview has ended, can't resume
        return;
      }

      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.play();
      } else {
        console.log('[Mock Player] Resumed');
      }

      const { hasRecordedPlay, playStartTime } = get();
      if (!hasRecordedPlay && !playStartTime && !isPreviewMode) {
        set({ playStartTime: Date.now() });
      }

      set({ isPlaying: true });
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  },

  stop: async () => {
    try {
      // Only record play if not in preview mode
      if (!get().isPreviewMode) {
        await get().checkAndRecordPlay();
      }

      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      }

      // Reset volume
      await resetVolume();

      set({
        currentTrack: null,
        isPlaying: false,
        position: 0,
        playStartTime: null,
        hasRecordedPlay: false,
        isPreviewMode: false,
        previewEndTime: null,
      });
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  },

  skipNext: async () => {
    try {
      if (!get().isPreviewMode) {
        await get().checkAndRecordPlay();
      }

      if (isNativePlayerAvailable && TrackPlayer) {
        await TrackPlayer.skipToNext();
      }

      set({
        playStartTime: Date.now(),
        hasRecordedPlay: false,
        isPreviewMode: false,
        previewEndTime: null,
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
        isPreviewMode: false,
        previewEndTime: null,
      });
    } catch (error) {
      console.error('Failed to skip previous:', error);
    }
  },

  seekTo: async (position) => {
    // Disable seeking in preview mode
    if (get().isPreviewMode) {
      console.log('[Preview Mode] Seeking disabled in preview mode');
      return;
    }

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

  dismissSignupPrompt: () => set({ showSignupPrompt: false }),

  // Critical: Record play after 30 seconds (only for authenticated users)
  checkAndRecordPlay: async () => {
    const { currentTrack, playStartTime, hasRecordedPlay, position, duration, isPreviewMode } = get();

    // Never record plays in preview mode
    if (isPreviewMode) {
      return;
    }

    if (hasRecordedPlay) {
      return; // Already recorded this play
    }

    if (!currentTrack) {
      console.log('[checkAndRecordPlay] No current track');
      return;
    }

    if (!playStartTime) {
      console.log('[checkAndRecordPlay] No playStartTime - user may not be authenticated');
      return;
    }

    const listenDuration = Date.now() - playStartTime;

    if (listenDuration < 30000) {
      return; // Not yet 30 seconds
    }

    console.log(`[checkAndRecordPlay] 30s threshold reached! Recording play for track: ${currentTrack.title}`);

    try {
      // Get user_id from auth store
      const { useAuthStore } = await import('./authStore');
      const user = useAuthStore.getState().user;

      if (!user) {
        // Only log once per track to reduce noise
        if (!get().hasRecordedPlay) {
          console.log('Play recording skipped: not logged in');
          set({ hasRecordedPlay: true }); // Prevent repeated logs
        }
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

      // Show payment toast with LISTENER dividend (not artist payment)
      const Toast = (await import('react-native-toast-message')).default;
      const payment = response.data.payment;

      if (payment) {
        const isFirstListen = response.data.is_first_listen;
        const listenerDividend = payment.listenerDividend || 0;
        const tierMultiplier = payment.tierMultiplier || 1.0;
        const listenerTier = payment.listenerTier || 'BRONZE';
        const isNewArtistDiscovery = isFirstListen;

        // Format tier for display
        const tierDisplay = listenerTier.charAt(0) + listenerTier.slice(1).toLowerCase();

        // Determine toast type based on discovery
        const toastType = isNewArtistDiscovery ? 'discovery' : 'payment';

        Toast.show({
          type: toastType,
          text1: isNewArtistDiscovery
            ? `🎉 Discovery! +$${listenerDividend.toFixed(3)}`
            : `+$${listenerDividend.toFixed(3)}`,
          text2: tierMultiplier > 1
            ? `${tierDisplay} tier (${tierMultiplier}x bonus)`
            : `${tierDisplay} tier`,
          position: 'bottom',
          visibilityTime: 4000,
          bottomOffset: 140, // Above mini player
        });

        // Record payment to history store
        if (listenerDividend > 0) {
          const { usePaymentHistoryStore } = await import('./paymentHistoryStore');
          usePaymentHistoryStore.getState().addPayment({
            trackId: String(currentTrack.id),
            trackTitle: currentTrack.title,
            artistName: getArtistName(currentTrack),
            amount: listenerDividend,
            tierMultiplier,
            isDiscovery: isNewArtistDiscovery,
            timestamp: new Date().toISOString(),
          });
        }

        // Check for Gamification updates (XP gained)
        // delayed slightly to let the payment toast appear first or stack nicely
        setTimeout(() => {
          const { useGamificationStore } = require('./gamificationStore');
          useGamificationStore.getState().checkForUpdates();
        }, 1000);
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
    isPreviewMode: false,
    previewEndTime: null,
    showSignupPrompt: false,
    isFadingOut: false,
  }),
}));

// Helper for fading out and stopping
async function fadeOutAndStop(): Promise<void> {
  await fadeOutVolume();

  if (isNativePlayerAvailable && TrackPlayer) {
    try {
      await TrackPlayer.pause();
    } catch (e) {
      // Ignore
    }
  }

  // Reset volume for next play
  await resetVolume();

  usePlayerStore.setState({
    isPlaying: false,
    previewEndTime: null,
    isFadingOut: false,
  });
}
