import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api/client';
import { usePlayerStore } from '@/lib/store/playerStore';
import { theme } from '@/constants/theme';
import type { Track } from '@/types';

export default function DiscoverScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying } = usePlayerStore();

  const fetchTracks = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/discovery');
      setTracks(response.data.tracks || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch tracks:', err);
      setError(err.response?.data?.message || 'Failed to load tracks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracks();
  };

  const handleTrackPress = async (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        await usePlayerStore.getState().pause();
      } else {
        await usePlayerStore.getState().resume();
      }
    } else {
      await usePlayerStore.getState().playTrack(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrack = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.trackCard, isActive && styles.trackCardActive]}
        onPress={() => handleTrackPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.coverContainer}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="musical-note" size={24} color={theme.colors.textMuted} />
            </View>
          )}
          {isActive && (
            <View style={styles.playingOverlay}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={theme.colors.background}
              />
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist_name}</Text>
          <View style={styles.trackMeta}>
            <Text style={styles.duration}>{formatDuration(item.duration_seconds)}</Text>
            <Text style={styles.plays}>{item.play_count?.toLocaleString() || 0} plays</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find new music, earn rewards</Text>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTracks}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrack}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No tracks available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  trackCardActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(232, 232, 232, 0.85)',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  trackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  duration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  plays: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.md,
  },
  moreButton: {
    padding: theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  retryText: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
