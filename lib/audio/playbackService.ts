// This file is only loaded when native TrackPlayer is available
// It runs in a separate JS context (background)

export async function PlaybackService() {
  // Dynamic import to avoid crashes when module isn't available
  const TrackPlayer = require('react-native-track-player').default;
  const { Event } = require('react-native-track-player');

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event: any) => {
    TrackPlayer.seekTo(event.position);
  });

  // Handle playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, (event: any) => {
    console.log('Playback state:', event.state);
  });

  // Handle track changes
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event: any) => {
    console.log('Track changed:', event.track?.title);
  });

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, (event: any) => {
    console.error('Playback error:', event);
  });
}
