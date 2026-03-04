import { theme } from '@/constants/theme';
import { getAnalytics, getFinancialMetrics } from '@/lib/api/admin.service';
import type { AdminAnalytics, FinancialMetrics } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [financial, setFinancial] = useState<FinancialMetrics | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [analyticsRes, financialRes] = await Promise.all([
        getAnalytics().catch(() => null),
        getFinancialMetrics().catch(() => null),
      ]);
      if (analyticsRes) setAnalytics(analyticsRes);
      if (financialRes) setFinancial(financialRes);
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

  if (loading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Analytics' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Platform Analytics' }} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* User Stats */}
        <LinearGradient colors={['#1E3A5F', '#0D1F33']} style={s.banner}>
          <View style={s.bannerHeader}>
            <Ionicons name="people" size={24} color="#60A5FA" />
            <Text style={s.bannerTitle}>Users</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{fmt(analytics?.users?.total ?? 0)}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{fmt(analytics?.users?.artists ?? 0)}</Text>
              <Text style={s.statLabel}>Artists</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{fmt(analytics?.users?.listeners ?? 0)}</Text>
              <Text style={s.statLabel}>Listeners</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Track Stats */}
        <Text style={s.section}>Tracks & Plays</Text>
        <View style={s.cardRow}>
          <View style={s.card}>
            <Ionicons name="musical-notes" size={22} color="#F59E0B" />
            <Text style={[s.cardValue, { color: '#F59E0B' }]}>{fmt(analytics?.tracks?.total ?? 0)}</Text>
            <Text style={s.cardLabel}>Total Tracks</Text>
          </View>
          <View style={s.card}>
            <Ionicons name="play" size={22} color="#EC4899" />
            <Text style={[s.cardValue, { color: '#EC4899' }]}>{fmt(analytics?.tracks?.totalPlays ?? 0)}</Text>
            <Text style={s.cardLabel}>Total Plays</Text>
          </View>
        </View>

        {/* Revenue */}
        <Text style={s.section}>Revenue</Text>
        <LinearGradient colors={['#1E5F3A', '#0D331F']} style={s.banner}>
          <View style={s.bannerHeader}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={s.bannerTitle}>Revenue</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>${money(analytics?.revenue?.total ?? 0)}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>${money(analytics?.revenue?.monthly ?? 0)}</Text>
              <Text style={s.statLabel}>Monthly</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Financial Breakdown */}
        {financial && (
          <>
            <Text style={s.section}>Financial Breakdown</Text>
            <View style={s.detailCard}>
              <DetailRow label="Gross Revenue" value={`$${money(financial.revenue.gross)}`} color="#10B981" />
              <View style={s.divider} />
              <DetailRow label="Net Revenue" value={`$${money(financial.revenue.net)}`} color="#10B981" />
              <View style={s.divider} />
              <DetailRow label="Subscriptions" value={`$${money(financial.revenue.subscriptions)}`} color="#60A5FA" />
              <View style={s.divider} />
              <DetailRow label="Artist Payments" value={`$${money(financial.costs.artistPayments)}`} color="#F59E0B" />
              <View style={s.divider} />
              <DetailRow label="Listener Rewards" value={`$${money(financial.costs.listenerDividends)}`} color="#8B5CF6" />
              <View style={s.divider} />
              <DetailRow label="Profit Margin" value={`${financial.metrics.profitMargin.toFixed(1)}%`} color={financial.metrics.profitMargin >= 0 ? '#10B981' : '#F87171'} bold />
            </View>
          </>
        )}

        {/* Growth */}
        <Text style={s.section}>Growth</Text>
        <View style={s.cardRow}>
          <View style={s.card}>
            <Ionicons name="trending-up" size={22} color="#10B981" />
            <Text style={[s.cardValue, { color: '#10B981' }]}>
              {(analytics?.growth?.userGrowthRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={s.cardLabel}>User Growth</Text>
          </View>
          <View style={s.card}>
            <Ionicons name="cash" size={22} color="#14B8A6" />
            <Text style={[s.cardValue, { color: '#14B8A6' }]}>
              {(analytics?.growth?.revenueGrowthRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={s.cardLabel}>Revenue Growth</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[s.detailValue, { color }, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 80 },
  banner: { borderRadius: 12, padding: 20, marginBottom: 8 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  bannerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 16 },
  cardRow: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 10, alignItems: 'center' },
  cardValue: { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
  cardLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  detailCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border },
});
