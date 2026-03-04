import { theme } from '@/constants/theme';
import {
  getContentModeration,
  getPendingTracks,
  approveTrack,
  rejectTrack,
} from '@/lib/api/admin.service';
import type { ContentModeration, ReviewTrack } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type TabKey = 'pending' | 'approved' | 'rejected';

export default function ModerationScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moderation, setModeration] = useState<ContentModeration | null>(null);
  const [tracks, setTracks] = useState<ReviewTrack[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [modRes, tracksRes] = await Promise.all([
        getContentModeration().catch(() => null),
        getPendingTracks(activeTab).catch(() => ({ tracks: [], count: 0 })),
      ]);
      if (modRes) setModeration(modRes);
      setTracks(tracksRes.tracks || []);
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

  const handleApprove = async (trackId: number) => {
    setActionLoading(trackId);
    try {
      await approveTrack(trackId);
      Toast.show({ type: 'success', text1: 'Track approved' });
      setTracks(prev => prev.filter(t => t.id !== trackId));
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to approve track' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (trackId: number) => {
    Alert.prompt(
      'Reject Track',
      'Enter a reason for rejection:',
      async (reason) => {
        if (!reason?.trim()) return;
        setActionLoading(trackId);
        try {
          await rejectTrack(trackId, reason.trim());
          Toast.show({ type: 'success', text1: 'Track rejected' });
          setTracks(prev => prev.filter(t => t.id !== trackId));
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to reject track' });
        } finally {
          setActionLoading(null);
        }
      },
      'plain-text'
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <Stack.Screen options={{ title: 'Moderation' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Content Moderation' }} />

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <Text style={[s.summaryValue, { color: '#F59E0B' }]}>{moderation?.totalPending ?? 0}</Text>
          <Text style={s.summaryLabel}>Pending</Text>
        </View>
        <View style={s.summaryCard}>
          <Ionicons name="flag" size={20} color="#F87171" />
          <Text style={[s.summaryValue, { color: '#F87171' }]}>{moderation?.flaggedContent?.length ?? 0}</Text>
          <Text style={s.summaryLabel}>Flagged</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['pending', 'approved', 'rejected'] as TabKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
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
            <Text style={s.emptyText}>No {activeTab} tracks</Text>
          </View>
        ) : (
          tracks.map(track => (
            <View key={track.id} style={s.trackCard}>
              <View style={s.trackHeader}>
                <View style={s.trackInfo}>
                  <Text style={s.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={s.trackArtist} numberOfLines={1}>{track.artist_name}</Text>
                </View>
                <Text style={s.trackDate}>{new Date(track.created_at).toLocaleDateString()}</Text>
              </View>
              {track.genre && <Text style={s.trackGenre}>{track.genre}</Text>}
              {activeTab === 'pending' && (
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.approveBtn]}
                    onPress={() => handleApprove(track.id)}
                    disabled={actionLoading === track.id}
                  >
                    {actionLoading === track.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.actionBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn]}
                    onPress={() => handleReject(track.id)}
                    disabled={actionLoading === track.id}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  summaryCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  summaryLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.primary + '20' },
  tabText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  content: { padding: 16, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: theme.colors.textMuted },
  trackCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  trackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackInfo: { flex: 1, marginRight: 8 },
  trackTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  trackArtist: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  trackDate: { fontSize: 11, color: theme.colors.textMuted },
  trackGenre: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6, backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#F87171' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
