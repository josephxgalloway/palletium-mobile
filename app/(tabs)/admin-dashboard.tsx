import { theme } from '@/constants/theme';
import { getAnalytics, getSystemHealth, getReviewMetrics } from '@/lib/api/admin.service';
import type { AdminAnalytics, SystemHealth, ReviewMetrics } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [reviewMetrics, setReviewMetrics] = useState<ReviewMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analyticsRes, healthRes, reviewRes] = await Promise.all([
        getAnalytics().catch(() => null),
        getSystemHealth().catch(() => null),
        getReviewMetrics().catch(() => null),
      ]);
      if (analyticsRes) setAnalytics(analyticsRes);
      if (healthRes) setHealth(healthRes);
      if (reviewRes) setReviewMetrics(reviewRes);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const openWebAdmin = (path: string) => {
    Linking.openURL(`https://palletium.com/admin/${path}`);
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

  const healthStatus = health?.database?.status === 'healthy' ? 'OPERATIONAL' : 'DEGRADED';
  const healthColor = healthStatus === 'OPERATIONAL' ? '#10B981' : '#F59E0B';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Platform Health Banner */}
        <LinearGradient colors={['#1E3A5F', '#0D1F33']} style={styles.healthBanner}>
          <View style={styles.healthHeader}>
            <Ionicons name="pulse" size={24} color="#60A5FA" />
            <Text style={styles.healthTitle}>Platform Health</Text>
            <View style={[styles.healthBadge, { backgroundColor: `${healthColor}33` }]}>
              <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
              <Text style={[styles.healthBadgeText, { color: healthColor }]}>{healthStatus}</Text>
            </View>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{health?.api?.requestsPerMinute ?? 0}</Text>
              <Text style={styles.healthStatLabel}>API RPM</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{health?.users?.totalActive ?? 0}</Text>
              <Text style={styles.healthStatLabel}>Active Users</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{Math.round(health?.database?.responseTime ?? 0)}ms</Text>
              <Text style={styles.healthStatLabel}>DB Response</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Platform Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people" label="Total Users" value={formatNumber(analytics?.users?.total || 0)} color="#60A5FA" />
          <StatCard icon="mic" label="Artists" value={formatNumber(analytics?.users?.artists || 0)} color="#10B981" />
          <StatCard icon="headset" label="Listeners" value={formatNumber(analytics?.users?.listeners || 0)} color="#8B5CF6" />
          <StatCard icon="musical-notes" label="Tracks" value={formatNumber(analytics?.tracks?.total || 0)} color="#F59E0B" />
          <StatCard icon="play" label="Total Plays" value={formatNumber(analytics?.tracks?.totalPlays || 0)} color="#EC4899" />
          <StatCard icon="cash" label="Revenue" value={`$${formatCurrency(analytics?.revenue?.total || 0)}`} color="#14B8A6" />
        </View>

        {/* Financial Overview */}
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Total Revenue</Text>
              <Text style={styles.financialValue}>${formatCurrency(analytics?.revenue?.total || 0)}</Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Monthly Revenue</Text>
              <Text style={styles.financialValue}>
                ${formatCurrency(analytics?.revenue?.monthly || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Requires Attention */}
        <Text style={styles.sectionTitle}>Requires Attention</Text>
        <View style={styles.attentionContainer}>
          <View style={styles.attentionCard}>
            <View style={[styles.attentionIcon, { backgroundColor: '#F59E0B33' }]}>
              <Ionicons name="document-text" size={24} color="#F59E0B" />
            </View>
            <View style={styles.attentionContent}>
              <Text style={styles.attentionLabel}>Pending Reviews</Text>
              <Text style={[styles.attentionValue, { color: '#F59E0B' }]}>
                {reviewMetrics?.pending_count ?? 0}
              </Text>
            </View>
          </View>
          <View style={styles.attentionCard}>
            <View style={[styles.attentionIcon, { backgroundColor: '#10B98133' }]}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <View style={styles.attentionContent}>
              <Text style={styles.attentionLabel}>Revenue Growth</Text>
              <Text style={[styles.attentionValue, { color: '#10B981' }]}>
                {(analytics?.growth?.revenueGrowthRate ?? 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton icon="shield-checkmark" label="Moderation" onPress={() => openWebAdmin('trust-safety')} />
          <QuickActionButton icon="warning" label="Fraud" onPress={() => openWebAdmin('trust-safety')} />
          <QuickActionButton icon="analytics" label="Analytics" onPress={() => openWebAdmin('analytics')} />
          <QuickActionButton icon="people" label="Users" onPress={() => openWebAdmin('users')} />
          <QuickActionButton icon="musical-note" label="Audio Analysis" onPress={() => openWebAdmin('audio-analysis')} />
          <QuickActionButton icon="server" label="System Health" onPress={() => openWebAdmin('system-health')} />
        </View>

        {/* Open Web Dashboard */}
        <TouchableOpacity
          style={styles.webDashboardButton}
          onPress={() => Linking.openURL('https://palletium.com/admin')}
        >
          <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.webDashboardText}>Open Full Admin Dashboard</Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function StatCard({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickActionButton({ icon, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// Helper Functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 60,
  },
  healthBanner: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  healthTitle: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  healthStats: {
    flexDirection: 'row',
  },
  healthStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  healthStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  healthStatLabel: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  financialCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
  },
  financialDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  financialLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  financialValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  attentionContainer: {
    gap: theme.spacing.sm,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  attentionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attentionContent: {
    flex: 1,
  },
  attentionLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  attentionValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  quickActionLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  webDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  webDashboardText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
