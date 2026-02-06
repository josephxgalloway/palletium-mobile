import { theme } from '@/constants/theme';
import {
  getReviewMetrics,
  getPendingTracks,
  approveTrack,
  rejectTrack,
} from '@/lib/api/admin.service';
import type { ReviewMetrics, ReviewTrack } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type FilterStatus = 'pending' | 'approved' | 'rejected';

export default function AdminReviewTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
  const [tracks, setTracks] = useState<ReviewTrack[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTracks();
  }, [filter]);

  const loadData = async () => {
    try {
      const [metricsRes, tracksRes] = await Promise.all([
        getReviewMetrics().catch(() => null),
        getPendingTracks(filter).catch(() => ({ tracks: [], count: 0 })),
      ]);
      if (metricsRes) setMetrics(metricsRes);
      setTracks(tracksRes?.tracks || []);
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTracks = async () => {
    try {
      const res = await getPendingTracks(filter).catch(() => ({ tracks: [], count: 0 }));
      setTracks(res?.tracks || []);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [filter]);

  const handleApprove = async (trackId: number) => {
    setActionLoading(trackId);
    try {
      await approveTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (metrics) {
        setMetrics({ ...metrics, pending_count: Math.max(0, metrics.pending_count - 1) });
      }
      Toast.show({ type: 'success', text1: 'Track approved' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to approve track' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (trackId: number, trackTitle: string) => {
    Alert.prompt(
      'Reject Track',
      `Provide a reason for rejecting "${trackTitle}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Toast.show({ type: 'error', text1: 'Reason is required' });
              return;
            }
            setActionLoading(trackId);
            try {
              await rejectTrack(trackId, reason.trim());
              setTracks((prev) => prev.filter((t) => t.id !== trackId));
              if (metrics) {
                setMetrics({ ...metrics, pending_count: Math.max(0, metrics.pending_count - 1) });
              }
              Toast.show({ type: 'success', text1: 'Track rejected' });
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Failed to reject track' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatLatency = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderTrackCard = ({ item }: { item: ReviewTrack }) => {
    const isActioning = actionLoading === item.id;
    return (
      <View style={styles.trackCard}>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist_name}</Text>
          <View style={styles.trackMeta}>
            {item.genre && <Text style={styles.trackGenre}>{item.genre}</Text>}
            <Text style={styles.trackDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
        {filter === 'pending' && (
          <View style={styles.trackActions}>
            <TouchableOpacity
              style={[styles.approveButton, isActioning && styles.disabledButton]}
              onPress={() => handleApprove(item.id)}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, isActioning && styles.disabledButton]}
              onPress={() => handleReject(item.id, item.title)}
              disabled={isActioning}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {filter !== 'pending' && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: filter === 'approved' ? '#10B98133' : '#F8717133' },
          ]}>
            <Text style={[
              styles.statusText,
              { color: filter === 'approved' ? '#10B981' : '#F87171' },
            ]}>
              {filter === 'approved' ? 'Approved' : 'Rejected'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review Queue</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Metrics Banner */}
      <LinearGradient colors={['#1E3A5F', '#0D1F33']} style={styles.metricsBanner}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.pending_count ?? 0}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>{metrics?.approvals_30d ?? 0}</Text>
            <Text style={styles.metricLabel}>Approved (30d)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F87171' }]}>{metrics?.rejections_30d ?? 0}</Text>
            <Text style={styles.metricLabel}>Rejected (30d)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatLatency(metrics?.avg_approval_latency_seconds ?? null)}</Text>
            <Text style={styles.metricLabel}>Avg Latency</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filter === status && styles.filterTabActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Track List */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrackCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === 'pending' ? 'No tracks pending review' : `No ${filter} tracks`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'pending' ? 'All caught up!' : 'Check back later.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  refreshButton: {
    padding: 8,
  },
  metricsBanner: {
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  filterTextActive: {
    color: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 60,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  trackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  trackGenre: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  trackDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  trackActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  approveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F87171',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
