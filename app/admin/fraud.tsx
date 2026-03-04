import { theme } from '@/constants/theme';
import { getFraudReports, blockUser } from '@/lib/api/admin.service';
import type { FraudReport } from '@/lib/api/admin.service';
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

export default function FraudScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fraud, setFraud] = useState<FraudReport | null>(null);
  const [blockingUser, setBlockingUser] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await getFraudReports();
      setFraud(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleBlock = (userId: number, userName: string) => {
    Alert.prompt(
      'Block User',
      `Block ${userName}? Enter a reason:`,
      async (reason) => {
        if (!reason?.trim()) return;
        setBlockingUser(userId);
        try {
          await blockUser(userId, reason.trim());
          Toast.show({ type: 'success', text1: `${userName} blocked` });
          await loadData();
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to block user' });
        } finally {
          setBlockingUser(null);
        }
      },
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Fraud Detection' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const highRisk = fraud?.highRiskCount ?? 0;
  const bannerColors = highRisk > 0 ? ['#5F1E1E', '#330D0D'] : ['#1E3A5F', '#0D1F33'];

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Fraud Detection' }} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <LinearGradient colors={bannerColors as [string, string]} style={s.banner}>
          <View style={s.bannerHeader}>
            <Ionicons name="shield" size={24} color={highRisk > 0 ? '#F87171' : '#60A5FA'} />
            <Text style={s.bannerTitle}>Fraud Overview</Text>
            {highRisk > 0 && (
              <View style={s.alertBadge}>
                <Text style={s.alertText}>{highRisk} HIGH RISK</Text>
              </View>
            )}
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statValue, highRisk > 0 && { color: '#F87171' }]}>{highRisk}</Text>
              <Text style={s.statLabel}>High Risk</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{fraud?.flaggedUsers ?? 0}</Text>
              <Text style={s.statLabel}>Flagged</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{fmt(fraud?.totalActivities ?? 0)}</Text>
              <Text style={s.statLabel}>Analyzed</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Risk Categories */}
        <Text style={s.section}>Risk Categories</Text>
        <View style={s.riskRow}>
          <RiskCard icon="musical-notes" label="Suspicious Playing" count={fraud?.riskCategories?.suspiciousPlaying ?? 0} color="#F59E0B" />
          <RiskCard icon="hardware-chip" label="Bot Behavior" count={fraud?.riskCategories?.botBehavior ?? 0} color="#F87171" />
          <RiskCard icon="globe" label="Multiple IPs" count={fraud?.riskCategories?.multipleIPs ?? 0} color="#8B5CF6" />
        </View>

        {/* Recent Flags */}
        {(fraud?.recentFlags?.length ?? 0) > 0 && (
          <>
            <Text style={s.section}>Recent Flags</Text>
            {fraud!.recentFlags.slice(0, 20).map(flag => (
              <View key={flag.id} style={s.flagCard}>
                <View style={s.flagHeader}>
                  <View style={[s.riskDot, {
                    backgroundColor: flag.fraudRisk.riskScore >= 80 ? '#F87171' : flag.fraudRisk.riskScore >= 50 ? '#F59E0B' : '#60A5FA',
                  }]} />
                  <Text style={s.flagUser} numberOfLines={1}>{flag.user?.name || flag.user?.email || `User ${flag.user_id}`}</Text>
                  <Text style={s.flagScore}>Risk: {flag.fraudRisk.riskScore}</Text>
                </View>
                {flag.fraudRisk.reasons?.length > 0 && (
                  <Text style={s.flagReasons} numberOfLines={2}>{flag.fraudRisk.reasons.join(', ')}</Text>
                )}
                <View style={s.flagFooter}>
                  <Text style={s.flagDate}>{new Date(flag.played_at).toLocaleDateString()}</Text>
                  {flag.fraudRisk.riskScore >= 70 && (
                    <TouchableOpacity
                      style={s.blockBtn}
                      onPress={() => handleBlock(flag.user_id, flag.user?.name || flag.user?.email || `User ${flag.user_id}`)}
                      disabled={blockingUser === flag.user_id}
                    >
                      {blockingUser === flag.user_id ? (
                        <ActivityIndicator size="small" color="#F87171" />
                      ) : (
                        <>
                          <Ionicons name="ban" size={14} color="#F87171" />
                          <Text style={s.blockBtnText}>Block</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RiskCard({ icon, label, count, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; count: number; color: string }) {
  return (
    <View style={s.riskCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[s.riskCount, { color }]}>{count}</Text>
      <Text style={s.riskLabel}>{label}</Text>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 80 },
  banner: { borderRadius: 12, padding: 20, marginBottom: 8 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  bannerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  alertBadge: { backgroundColor: 'rgba(248,113,113,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  alertText: { fontSize: 10, fontWeight: 'bold', color: '#F87171' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 16 },
  riskRow: { flexDirection: 'row', gap: 8 },
  riskCard: { flex: 1, backgroundColor: theme.colors.surface, padding: 14, borderRadius: 10, alignItems: 'center' },
  riskCount: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  riskLabel: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 },
  flagCard: { backgroundColor: theme.colors.surface, padding: 14, borderRadius: 10, marginBottom: 8 },
  flagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  flagUser: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  flagScore: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  flagReasons: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 },
  flagFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  flagDate: { fontSize: 11, color: theme.colors.textMuted },
  blockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(248,113,113,0.15)' },
  blockBtnText: { fontSize: 12, color: '#F87171', fontWeight: '600' },
});
