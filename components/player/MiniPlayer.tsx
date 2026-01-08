import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useTrackProgress } from '@/hooks/useTrackProgress';
import { theme } from '@/constants/theme';
import { getArtistName, getCoverUrl } from '@/types';

export default function MiniPlayer() {
  const { currentTrack, pause, resume, isPreviewMode } = usePlayerStore();
  const { position, duration, isPlaying, isBuffering } = useTrackProgress();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const coverUrl = getCoverUrl(currentTrack);
  const artistName = getArtistName(currentTrack);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/player')}
      activeOpacity={0.9}
    >
      {/* Progress bar at top */}
      <View style={styles.progressContainer}>
        <View style={[styles.progress, { width: `${progress}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Cover art */}
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
          </View>
        )}

        {/* Track info */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            {isPreviewMode && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>PREVIEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {artistName} • {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Controls */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            isPlaying ? pause() : resume();
          }}
        >
          {isBuffering ? (
            <Ionicons name="hourglass" size={28} color={theme.colors.textPrimary} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={theme.colors.textPrimary}
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above tab bar
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressContainer: {
    height: 2,
    backgroundColor: theme.colors.border,
  },
  progress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  previewBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  artist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
