import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useTrackProgress } from '@/hooks/useTrackProgress';
import { theme } from '@/constants/theme';
import { getArtistName, getCoverUrl } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePulse, usePressScale } from '@/hooks/usePlayerAnimations';

export default function MiniPlayer() {
  const { currentTrack, pause, resume, isPreviewMode } = usePlayerStore();
  const { position, duration, isPlaying, isBuffering } = useTrackProgress();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, 8);

  const pulseStyle = usePulse(isPlaying);
  const { onPressIn, onPressOut, animStyle: pressStyle } = usePressScale();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const coverUrl = getCoverUrl(currentTrack);
  const artistName = getArtistName(currentTrack);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  return (
    <View style={[styles.wrapper, { bottom: tabBarHeight + 4 }]}>
      {/* Floating frosted glass slab */}
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(27, 31, 43, 0.85)', 'rgba(33, 38, 55, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Glowing gradient progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFillContainer, { width: `${progress}%` }]}>
            <LinearGradient
              colors={['#6c86a8', '#c0c8d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressFill}
            />
            <View style={styles.progressGlow} />
          </View>
        </View>

        <View style={styles.container}>
          {/* Tappable track info area — opens full player */}
          <Pressable
            style={styles.trackArea}
            onPress={() => router.push('/player')}
          >
            {/* Cover art with expo-image for smooth transitions */}
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={styles.cover}
                transition={200}
              />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="musical-note" size={16} color={theme.colors.textMuted} />
              </View>
            )}

            {/* Track info */}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
                {isPreviewMode && (
                  <Text style={styles.previewTag}> PREVIEW</Text>
                )}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {artistName} · {formatTime(position)} / {formatTime(duration)}
              </Text>
            </View>
          </Pressable>

          {/* Animated play/pause button */}
          <Animated.View style={[pulseStyle, pressStyle]}>
            <Pressable
              onPress={handlePlayPause}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <LinearGradient
                colors={['rgba(192, 200, 214, 0.15)', 'rgba(108, 134, 168, 0.15)']}
                style={styles.playButton}
              >
                {isBuffering ? (
                  <Ionicons name="hourglass" size={20} color={theme.colors.textPrimary} />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 14,
    overflow: 'hidden',
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    // Subtle silver border
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 214, 0.08)',
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 14,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(192, 200, 214, 0.06)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  progressFillContainer: {
    height: '100%',
    borderRadius: 1.5,
    overflow: 'visible',
  },
  progressFill: {
    flex: 1,
    borderRadius: 1.5,
  },
  progressGlow: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    bottom: -1,
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
  },
  trackArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 214, 0.12)',
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 214, 0.2)',
  },
});
