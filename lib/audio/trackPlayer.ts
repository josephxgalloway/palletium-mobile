// Lazy load TrackPlayer - allows app to run in Expo Go without native module
let TrackPlayer: any = null;
let AppKilledPlaybackBehavior: any = null;
let Capability: any = null;
let RepeatMode: any = null;
let isNativeAvailable = false;

try {
  const rntp = require('react-native-track-player');
  TrackPlayer = rntp.default;
  AppKilledPlaybackBehavior = rntp.AppKilledPlaybackBehavior;
  Capability = rntp.Capability;
  RepeatMode = rntp.RepeatMode;
  isNativeAvailable = true;
} catch (e) {
  console.warn('TrackPlayer not available - audio will be mocked');
}

let isInitialized = false;

export async function setupPlayer(): Promise<boolean> {
  if (!isNativeAvailable || !TrackPlayer) {
    console.log('Running in mock player mode (Expo Go)');
    return true; // Return true so app continues
  }

  if (isInitialized) {
    return true;
  }

  try {
    // Check if already set up
    await TrackPlayer.getActiveTrack();
    isInitialized = true;
    return true;
  } catch {
    // Not set up yet, initialize
    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior?.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability?.Play,
          Capability?.Pause,
          Capability?.SkipToNext,
          Capability?.SkipToPrevious,
          Capability?.SeekTo,
          Capability?.Stop,
        ].filter(Boolean),
        compactCapabilities: [
          Capability?.Play,
          Capability?.Pause,
          Capability?.SkipToNext,
        ].filter(Boolean),
        progressUpdateEventInterval: 1,
      });

      if (RepeatMode) {
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
      }

      isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to setup player:', error);
      return false;
    }
  }
}

export async function resetPlayer(): Promise<void> {
  if (!isNativeAvailable || !TrackPlayer) return;

  try {
    await TrackPlayer.reset();
  } catch (error) {
    console.error('Failed to reset player:', error);
  }
}

export { isNativeAvailable };
