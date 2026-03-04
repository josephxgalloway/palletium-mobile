import { theme } from '@/constants/theme';
import { getAiReviewQueue, getAiReviewStats, approveAiTrack, confirmAiTrack } from '@/lib/api/admin.service';
import type { AiReviewTrack, AiReviewStats } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

type TabKey = 'pending_review' | 'flagged' | 'all';

export default function AudioAnalysisScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AiReviewStats | null>(null);
  const [tracks, setTracks] = useState<AiReviewTrack[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('pending_review');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        getAiReviewStats().catch(() => null),
        getAiReviewQueue(activeTab).catch(() => ({ tracks: [], pagination: { page: 1, total: 0, totalPages: 0 } })),
      ]);
      if (statsRes?.stats) setStats(statsRes.stats);
      setTracks(queueRes.tracks || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleApproveHuman = async (track: AiReviewTrack) => {
    Alert.alert(
      'Approve as Human',
      `Mark "${track.title}" as human-created? This enables Dynasty Mode rates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(track.id);
            try {
              await approveAiTrack(track.id);
              Toast.show({ type: 'success', text1: 'Track approved as human-created' });
              setTracks(prev => prev.filter(t => t.id !== track.id));
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to approve track' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleConfirmAi = async (track: AiReviewTrack) => {
    Alert.alert(
      'Confirm AI-Generated',
      `Confirm "${track.title}" as AI-generated? This sets the $0.004 rate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm AI',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(track.id);
            try {
              await confirmAiTrack(track.id);
              Toast.show({ type: 'success', text1: 'Track confirmed as AI-generated' });
              setTracks(prev => prev.filter(t => t.id !== track.id));
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to confirm AI status' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Audio Analysis' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'AI Content Review' }} />

      {/* Stats Banner */}
      <LinearGradient colors={['#3B1E5F', '#1F0D33']} style={s.banner}>
        <View style={s.bannerHeader}>
          <Ionicons name="scan" size={24} color="#A855F6" />
          <Text style={s.bannerTitle}>AI Detection</Text>
        </View>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#F59E0B' }]}>{stats?.pending_review_count ?? 0}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#F87171' }]}>{stats?.flagged_count ?? 0}</Text>
            <Text style={s.statLabel}>Flagged</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#10B981' }]}>{stats?.approved_count ?? 0}</Text>
            <Text style={s.statLabel}>Approved</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats?.rejected_count ?? 0}</Text>
            <Text style={s.statLabel}>Rejected</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Platforms */}
      {stats?.by_platform && stats.by_platform.length > 0 && (
        <View style={s.platforms}>
          <Text style={s.platformTitle}>Detected Platforms</Text>
          <View style={s.platformRow}>
            {stats.by_platform.map(p => (
              <View key={p.platform} style={s.platformChip}>
                <Text style={s.platformText}>{p.platform}: {p.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={s.tabBar}>
        {([['pending_review', 'Pending'], ['flagged', 'Flagged'], ['all', 'All']] as [TabKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, activeTab === key && s.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {tracks.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>No tracks to review</Text>
          </View>
        ) : (
          tracks.map(track => (
            <View key={track.id} style={s.trackCard}>
              <View style={s.trackHeader}>
                <View style={s.trackInfo}>
                  <Text style={s.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={s.trackArtist} numberOfLines={1}>{track.artist_name}</Text>
                </View>
                {track.ai_score != null && (
                  <View style={[s.scoreBadge, {
                    backgroundColor: track.ai_score >= 0.7 ? '#F8717120' : track.ai_score >= 0.4 ? '#F59E0B20' : '#10B98120',
                  }]}>
                    <Text style={[s.scoreText, {
                      color: track.ai_score >= 0.7 ? '#F87171' : track.ai_score >= 0.4 ? '#F59E0B' : '#10B981',
                    }]}>
                      {(track.ai_score * 100).toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.trackMeta}>
                {track.detected_ai_platform && (
                  <Text style={s.metaChip}>{track.detected_ai_platform}</Text>
                )}
                <Text style={s.metaText}>{track.ai_review_status}</Text>
                {track.artist_verified && <Text style={[s.metaText, { color: '#10B981' }]}>Verified</Text>}
              </View>
              {track.ai_detection_flags && track.ai_detection_flags.length > 0 && (
                <Text style={s.flags} numberOfLines={2}>{track.ai_detection_flags.join(', ')}</Text>
              )}
              {(track.ai_review_status === 'pending_review' || track.ai_review_status === 'flagged') && (
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleApproveHuman(track)}
                    disabled={actionLoading === track.id}
                  >
                    {actionLoading === track.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person" size={14} color="#fff" />
                        <Text style={s.actionBtnText}>Human</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#F87171' }]}
                    onPress={() => handleConfirmAi(track)}
                    disabled={actionLoading === track.id}
                  >
                    <Ionicons name="hardware-chip" size={14} color="#fff" />
                    <Text style={s.actionBtnText}>AI</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 12 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  bannerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  platforms: { paddingHorizontal: 16, marginTop: 12 },
  platformTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  platformChip: { backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  platformText: { fontSize: 12, color: theme.colors.textSecondary },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.primary + '20' },
  tabText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  content: { padding: 16, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: theme.colors.textMuted },
  trackCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  trackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackInfo: { flex: 1, marginRight: 8 },
  trackTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  trackArtist: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scoreText: { fontSize: 13, fontWeight: 'bold' },
  trackMeta: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 11, color: '#A855F6', backgroundColor: '#A855F620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
  flags: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
