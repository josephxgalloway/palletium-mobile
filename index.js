import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Try to register playback service - only works with dev build, not Expo Go
try {
  const TrackPlayer = require('react-native-track-player').default;
  const { PlaybackService } = require('./lib/audio/playbackService');
  TrackPlayer.registerPlaybackService(() => PlaybackService);
  console.log('TrackPlayer service registered');
} catch (e) {
  console.log('TrackPlayer not available - running in Expo Go mode');
}

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
