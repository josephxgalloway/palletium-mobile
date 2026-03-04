import { theme } from '@/constants/theme';
import api, { getArtistTracks } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface Track {
  id: number;
  title?: string;
  genre?: string;
  plays?: number;
  play_count?: number;
  duration?: number;
  review_status?: 'pending' | 'approved' | 'rejected' | 'draft';
  is_public?: boolean;
  created_at?: string;
  cover_art_url?: string;
  coverArtUrl?: string;
  cover_url?: string;
  artwork_url?: string;
}

interface StudioStats {
  totalTracks: number;
  totalPlays: number;
  totalEarnings: number;
  pendingEarnings: number;
  uniqueListeners: number;
}

export default function StudioScreen() {
  const { user } = useAuthStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isArtist = user?.type === 'artist';

  const fetchData = useCallback(async () => {
    if (!user?.id || !isArtist) {
      setLoading(false);
      return;
    }

    try {
      const [tracksData, analyticsData] = await Promise.all([
        getArtistTracks(user.id).catch(() => []),
        api.get(`/analytics/artist/${user.id}/overview`).catch(() => ({ data: {} })),
      ]);

      let trackList: Track[] = [];
      if (Array.isArray(tracksData)) {
        trackList = tracksData;
      } else if (tracksData?.tracks && Array.isArray(tracksData.tracks)) {
        trackList = tracksData.tracks;
      } else if (tracksData?.data && Array.isArray(tracksData.data)) {
        trackList = tracksData.data;
      }

      trackList.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setTracks(trackList);

      const analytics = analyticsData.data || {};
      setStats({
        totalTracks: trackList.length,
        totalPlays: analytics.totalPlays || 0,
        totalEarnings: analytics.totalEarnings || 0,
        pendingEarnings: analytics.pendingEarnings || 0,
        uniqueListeners: analytics.uniqueListeners || 0,
      });
    } catch (error: any) {
      console.error('Studio: Failed to fetch data:', error);
      Toast.show({ type: 'error', text1: 'Failed to load studio data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isArtist]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEditTrack = (track: Track) => {
    router.push(`/artist/track/${track.id}/edit` as any);
  };

  const formatNumber = (num: number | undefined | null): string => {
    if (num == null) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number | undefined | null): string => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string | undefined | null) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'rejected':
        return theme.colors.error;
      case 'draft':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusLabel = (track: Track) => {
    if (!track.review_status) return 'Unknown';
    if (track.review_status === 'approved') {
      return track.is_public ? 'Live' : 'Private';
    }
    return track.review_status.charAt(0).toUpperCase() + track.review_status.slice(1);
  };

  // Non-artist view
  if (!isArtist) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['rgba(108,134,168,0.12)', 'transparent']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.header}>
          <Text style={styles.title}>Studio</Text>
          <Text style={styles.subtitle}>Artist tools and track management</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="mic-outline" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Artist Studio</Text>
          <Text style={styles.emptySubtext}>This feature is for artists only</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Glass Stats Cards */}
      <View style={styles.statsGrid}>
        <Pressable
          style={styles.statCard}
          onPress={() => router.push('/stats/earnings' as any)}
        >
          <LinearGradient
            colors={['rgba(34,139,34,0.15)', 'rgba(34,139,34,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.statIconRing}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>${(stats?.totalEarnings || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </Pressable>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(108,134,168,0.15)', 'rgba(108,134,168,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.statIconRing}>
            <Ionicons name="play-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{formatNumber(stats?.totalPlays || 0)}</Text>
          <Text style={styles.statLabel}>Plays</Text>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(192,200,214,0.12)', 'rgba(192,200,214,0.04)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.statIconRing}>
            <Ionicons name="people-outline" size={20} color={theme.colors.accent} />
          </View>
          <Text style={styles.statValue}>{formatNumber(stats?.uniqueListeners || 0)}</Text>
          <Text style={styles.statLabel}>Listeners</Text>
        </View>
      </View>

      {/* Gradient Earnings CTA */}
      <Pressable
        style={styles.actionButton}
        onPress={() => router.push('/stats/earnings' as any)}
      >
        <LinearGradient
          colors={['#6c86a8', '#4a6a8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionGradient}
        >
          <Ionicons name="trending-up" size={20} color="#fff" />
          <Text style={styles.actionText}>View Earnings</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {(stats?.pendingEarnings || 0) > 0 && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.pendingText}>
            ${(stats?.pendingEarnings || 0).toFixed(2)} pending payout
          </Text>
        </View>
      )}

      {/* Glass Upload CTA */}
      <Pressable
        style={styles.uploadPrompt}
        onPress={() => router.push('/upload' as any)}
      >
        <LinearGradient
          colors={['rgba(27,31,43,0.6)', 'rgba(33,38,55,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.uploadIcon}>
          <LinearGradient
            colors={['rgba(192,200,214,0.2)', 'rgba(108,134,168,0.2)']}
            style={styles.uploadIconGradient}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.accent} />
          </LinearGradient>
        </View>
        <View style={styles.uploadTextContainer}>
          <Text style={styles.uploadTitle}>Upload New Track</Text>
          <Text style={styles.uploadSubtitle}>Add music to your catalog</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </Pressable>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Tracks</Text>
        <Text style={styles.trackCount}>{tracks.length} tracks</Text>
      </View>
    </View>
  );

  const getTrackCoverUrl = (track: Track): string | null =>
    track.cover_art_url || track.coverArtUrl || track.cover_url || track.artwork_url || null;

  const renderTrackItem = ({ item }: { item: Track }) => {
    const coverUrl = getTrackCoverUrl(item);
    return (
      <Pressable style={styles.trackCard} onPress={() => handleEditTrack(item)}>
        <View style={styles.trackCover}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.trackCoverImage}
              contentFit="cover"
              transition={120}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="musical-notes" size={20} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          <Text style={styles.trackMeta}>
            {item.genre || 'No genre'}{item.duration ? ` · ${formatDuration(item.duration)}` : ''} · {formatNumber(item.plays ?? item.play_count)} plays
          </Text>
        </View>

        <View style={styles.trackActions}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.review_status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </Pressable>
    );
  };

  const renderEmptyTracks = () => (
    <View style={styles.emptyTracks}>
      <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
      <Text style={styles.emptyText}>No tracks yet</Text>
      <Text style={styles.emptySubtext}>Upload your first track on the web platform</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['rgba(108,134,168,0.12)', 'transparent']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.header}>
          <Text style={styles.title}>Studio</Text>
          <Text style={styles.subtitle}>Manage your music</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient gradient */}
      <LinearGradient
        colors={['rgba(108,134,168,0.12)', 'transparent', 'rgba(108,134,168,0.06)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <Text style={styles.title}>Studio</Text>
        <Text style={styles.subtitle}>Manage your music</Text>
      </View>

      <FlatList
        data={tracks}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyTracks}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108,134,168,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  // Glass Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: theme.spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  statIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(192,200,214,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // Gradient Actions
  actionButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: theme.spacing.sm,
    borderRadius: 10,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  pendingText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  // Glass Upload CTA
  uploadPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  uploadIcon: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  uploadIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  uploadSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  trackCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  // Glass Track Card
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,31,43,0.6)',
    padding: theme.spacing.md,
    borderRadius: 14,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
  },
  trackCoverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  trackMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Empty States
  emptyTracks: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
