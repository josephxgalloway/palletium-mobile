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
  const { setPosition, setDuration, setIsPlaying, checkAndRecordPlay, checkPreviewEnd, isPlaying, position, duration, currentTrack, isPreviewMode } = usePlayerStore();
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Update playing state (only for native player)
  useEffect(() => {
    if (isNativeAvailable && State) {
      const playing = playbackState.state === State.Playing;
      setIsPlaying(playing);
    }
  }, [playbackState.state, setIsPlaying]);

  // Set up interval to check for 30s threshold and preview end while playing
  useEffect(() => {
    const isCurrentlyPlaying = isNativeAvailable && State
      ? playbackState.state === State.Playing
      : isPlaying;

    if (isCurrentlyPlaying) {
      // Check every second while playing (needed for preview timing)
      checkIntervalRef.current = setInterval(() => {
        // Check preview end (for unauthenticated users)
        if (isPreviewMode) {
          checkPreviewEnd();
        } else {
          // Check for play recording (for authenticated users)
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
  }, [playbackState.state, isPlaying, isPreviewMode, checkAndRecordPlay, checkPreviewEnd]);

  // For native player
  if (isNativeAvailable && State) {
    return {
      position: progress.position,
      duration: progress.duration,
      buffered: progress.buffered,
      isPlaying: playbackState.state === State.Playing,
      isBuffering: playbackState.state === State.Buffering || playbackState.state === State.Loading,
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
