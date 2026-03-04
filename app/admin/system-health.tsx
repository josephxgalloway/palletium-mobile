import { theme } from '@/constants/theme';
import { getSystemHealth } from '@/lib/api/admin.service';
import type { SystemHealth } from '@/lib/api/admin.service';
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

export default function SystemHealthScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await getSystemHealth();
      setHealth(res);
      setLastChecked(new Date());
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
        <Stack.Screen options={{ title: 'System Health' }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const dbOk = health?.database?.status === 'healthy';
  const apiOk = health?.api?.status === 'healthy';
  const allOk = dbOk && apiOk;
  const overallColor = allOk ? '#10B981' : '#F59E0B';
  const overallLabel = allOk ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED PERFORMANCE';

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'System Health' }} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Status */}
        <LinearGradient
          colors={allOk ? ['#0D331F', '#1E5F3A'] : ['#332E0D', '#5F4E1E']}
          style={s.banner}
        >
          <View style={s.bannerHeader}>
            <Ionicons name="pulse" size={28} color={overallColor} />
            <View style={s.bannerContent}>
              <Text style={[s.overallLabel, { color: overallColor }]}>{overallLabel}</Text>
              {lastChecked && (
                <Text style={s.lastChecked}>Last check: {lastChecked.toLocaleTimeString()}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Database */}
        <Text style={s.section}>Database</Text>
        <View style={s.card}>
          <StatusRow icon="server" label="Status" value={health?.database?.status ?? 'unknown'} ok={dbOk} />
          <View style={s.divider} />
          <MetricRow label="Response Time" value={`${Math.round(health?.database?.responseTime ?? 0)}ms`} />
          <View style={s.divider} />
          <MetricRow label="Connections" value={`${health?.database?.connections ?? 0}`} />
        </View>

        {/* API */}
        <Text style={s.section}>API</Text>
        <View style={s.card}>
          <StatusRow icon="globe" label="Status" value={health?.api?.status ?? 'unknown'} ok={apiOk} />
          <View style={s.divider} />
          <MetricRow label="Requests/Min" value={`${health?.api?.requestsPerMinute ?? 0}`} />
          <View style={s.divider} />
          <MetricRow label="Avg Response" value={`${Math.round(health?.api?.averageResponseTime ?? 0)}ms`} />
        </View>

        {/* Users */}
        <Text style={s.section}>Active Users</Text>
        <View style={s.card}>
          <MetricRow label="Total Active" value={`${health?.users?.totalActive ?? 0}`} />
          <View style={s.divider} />
          <MetricRow label="Concurrent Listeners" value={`${health?.users?.concurrentListeners ?? 0}`} />
        </View>

        {/* Storage */}
        <Text style={s.section}>Storage</Text>
        <View style={s.card}>
          <MetricRow label="Audio Files" value={`${(health?.storage?.audioFiles ?? 0).toLocaleString()}`} />
          <View style={s.divider} />
          <MetricRow label="Total Size" value={health?.storage?.totalSize ?? 'N/A'} />
          <View style={s.divider} />
          <MetricRow label="Availability" value={health?.storage?.availability ?? 'N/A'} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatusRow({ icon, label, value, ok }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; ok: boolean }) {
  return (
    <View style={s.metricRow}>
      <Ionicons name={icon} size={18} color={ok ? '#10B981' : '#F59E0B'} />
      <Text style={s.metricLabel}>{label}</Text>
      <View style={[s.statusBadge, { backgroundColor: ok ? '#10B98120' : '#F59E0B20' }]}>
        <View style={[s.statusDot, { backgroundColor: ok ? '#10B981' : '#F59E0B' }]} />
        <Text style={[s.statusText, { color: ok ? '#10B981' : '#F59E0B' }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metricRow}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 80 },
  banner: { borderRadius: 12, padding: 20, marginBottom: 8 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerContent: { flex: 1 },
  overallLabel: { fontSize: 16, fontWeight: 'bold' },
  lastChecked: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  section: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 10, marginTop: 18 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 8 },
  metricLabel: { flex: 1, fontSize: 14, color: theme.colors.textSecondary },
  metricValue: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});
