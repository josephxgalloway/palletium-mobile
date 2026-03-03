import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';

// Try to load TrackPlayer hooks - they won't be available in Expo Go
let useProgress: any = null;
let usePlaybackState: any = null;
let useActiveTrack: any = null;
let State: any = null;
let isNativeAvailable = false;

try {
  const rntp = require('react-native-track-player');
  useProgress = rntp.useProgress;
  usePlaybackState = rntp.usePlaybackState;
  useActiveTrack = rntp.useActiveTrack;
  State = rntp.State;
  isNativeAvailable = true;
} catch (e) {
  // Running in Expo Go - hooks not available
}

// Mock hooks for when native module isn't available
function useMockProgress() {
  const { position, duration } = usePlayerStore();
  return { position, duration, buffered: 0 };
}

function useMockPlaybackState() {
  const { isPlaying } = usePlayerStore();
  return { state: isPlaying ? 'playing' : 'paused' };
}

function useMockActiveTrack() {
  const { currentTrack } = usePlayerStore();
  return currentTrack;
}

export function useTrackProgress() {
  const { setPosition, setDuration, checkAndRecordPlay, checkPreviewEnd, isPlaying, position, duration, currentTrack, isPreviewMode } = usePlayerStore();
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockPositionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use native hooks if available, otherwise use mock
  const progress = isNativeAvailable && useProgress ? useProgress(1000) : useMockProgress();
  const playbackState = isNativeAvailable && usePlaybackState ? usePlaybackState() : useMockPlaybackState();
  const activeTrack = isNativeAvailable && useActiveTrack ? useActiveTrack() : useMockActiveTrack();

  // Update store with progress (only for native player)
  useEffect(() => {
    if (isNativeAvailable) {
      setPosition(progress.position);
      setDuration(progress.duration);
    }
  }, [progress.position, progress.duration, setPosition, setDuration]);

  // NOTE: We intentionally do NOT sync native playbackState → store isPlaying.
  // The Zustand store is the source of truth for isPlaying, maintained by
  // playTrack/pause/resume/stop. The native usePlaybackState() hook is unreliable
  // in dev client builds and can report stale/wrong state, causing the play/pause
  // button to break (always shows "play" even while audio is playing).

  // Mock player position simulation (Expo Go only)
  useEffect(() => {
    if (isNativeAvailable) return; // Skip for native player

    if (isPlaying && currentTrack) {
      // Simulate position incrementing every second
      mockPositionIntervalRef.current = setInterval(() => {
        const currentPos = usePlayerStore.getState().position;
        const currentDur = usePlayerStore.getState().duration;
        if (currentPos < currentDur) {
          setPosition(currentPos + 1);
        }
      }, 1000);
    } else {
      if (mockPositionIntervalRef.current) {
        clearInterval(mockPositionIntervalRef.current);
        mockPositionIntervalRef.current = null;
      }
    }

    return () => {
      if (mockPositionIntervalRef.current) {
        clearInterval(mockPositionIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack, isNativeAvailable, setPosition]);

  // Set up interval to check for 30s threshold and preview end while playing
  useEffect(() => {
    // Always use store's isPlaying — native playbackState is unreliable
    const isCurrentlyPlaying = isPlaying;

    if (isCurrentlyPlaying && currentTrack) {
      console.log(`[useTrackProgress] Starting check interval for "${currentTrack.title}" (preview: ${isPreviewMode})`);

      // Check every second while playing (needed for preview timing and 30s payment)
      checkIntervalRef.current = setInterval(() => {
        // Check preview end (for unauthenticated users)
        if (isPreviewMode) {
          checkPreviewEnd();
        } else {
          // Check for play recording (for authenticated users)
          // Log for debugging
          const state = usePlayerStore.getState();
          const elapsed = state.playStartTime ? Math.floor((Date.now() - state.playStartTime) / 1000) : 0;
          if (elapsed > 0 && elapsed <= 35 && elapsed % 10 === 0) {
            console.log(`[Progress] ${elapsed}s elapsed, hasRecorded: ${state.hasRecordedPlay}, playStartTime: ${state.playStartTime ? 'set' : 'null'}`);
          }
          checkAndRecordPlay();
        }
      }, 1000);
    } else {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [playbackState.state, isPlaying, isPreviewMode, currentTrack, checkAndRecordPlay, checkPreviewEnd]);

  // For native player — use store's isPlaying (source of truth), native progress for position/duration
  if (isNativeAvailable && State) {
    // Only show buffering if we're in buffering/loading state AND position hasn't advanced past 1 second
    const rawBuffering = playbackState.state === State.Buffering || playbackState.state === State.Loading;
    const isBuffering = rawBuffering && progress.position < 1;

    return {
      position: progress.position,
      duration: progress.duration,
      buffered: progress.buffered,
      isPlaying,  // From Zustand store — reliable source of truth
      isBuffering,
      activeTrack,
    };
  }

  // For mock player (Expo Go)
  return {
    position,
    duration,
    buffered: 0,
    isPlaying,
    isBuffering: false,
    activeTrack: currentTrack,
  };
}
