import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useTrackProgress } from '@/hooks/useTrackProgress';
import { theme } from '@/constants/theme';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 80;

export default function PlayerScreen() {
  const { currentTrack, pause, resume, seekTo, skipNext, skipPrevious } = usePlayerStore();
  const { position, duration, isPlaying, isBuffering } = useTrackProgress();

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {currentTrack.cover_url ? (
          <Image
            source={{ uri: currentTrack.cover_url }}
            style={styles.artwork}
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Ionicons name="musical-note" size={80} color={theme.colors.textMuted} />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist_name}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryControl}>
          <Ionicons name="shuffle" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipControl} onPress={skipPrevious}>
          <Ionicons name="play-skip-back" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playControl}
          onPress={isPlaying ? pause : resume}
        >
          {isBuffering ? (
            <Ionicons name="hourglass" size={36} color={theme.colors.background} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color={theme.colors.background}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipControl} onPress={skipNext}>
          <Ionicons name="play-skip-forward" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryControl}>
          <Ionicons name="repeat" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Payment indicator */}
      <View style={styles.paymentInfo}>
        <Ionicons name="cash" size={16} color={theme.colors.success} />
        <Text style={styles.paymentText}>
          Payment triggers after 30 seconds
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: theme.borderRadius.lg,
  },
  artworkPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  artist: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  time: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipControl: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playControl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  paymentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
});
