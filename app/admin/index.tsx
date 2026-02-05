import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
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
import Toast from 'react-native-toast-message';

interface PlatformStats {
  total_users: number;
  total_artists: number;
  total_listeners: number;
  total_tracks: number;
  total_plays: number;
  total_revenue: number;
  pending_payouts: number;
  pending_reviews: number;
  active_subscriptions: number;
  new_users_today: number;
  new_tracks_today: number;
  plays_today: number;
}

interface RecentActivity {
  id: number;
  type: 'play' | 'signup' | 'upload' | 'subscription' | 'review';
  description: string;
  timestamp: string;
}

export default function AdminDashboardScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);

  // Check admin access
  const isAdmin = user?.is_admin || user?.type === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      Toast.show({ type: 'error', text1: 'Access denied', text2: 'Admin privileges required' });
      router.back();
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/admin/activity?limit=10').catch(() => ({ data: { activity: [] } })),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      setActivity(activityRes.data?.activity || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      // Show mock data for testing
      setStats({
        total_users: 0,
        total_artists: 0,
        total_listeners: 0,
        total_tracks: 0,
        total_plays: 0,
        total_revenue: 0,
        pending_payouts: 0,
        pending_reviews: 0,
        active_subscriptions: 0,
        new_users_today: 0,
        new_tracks_today: 0,
        plays_today: 0,
      });
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

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.textMuted} />
          <Text style={styles.accessDeniedText}>Admin Access Required</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
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
        <LinearGradient
          colors={['#1E3A5F', '#0D1F33']}
          style={styles.healthBanner}
        >
          <View style={styles.healthHeader}>
            <Ionicons name="pulse" size={24} color="#60A5FA" />
            <Text style={styles.healthTitle}>Platform Health</Text>
            <View style={styles.healthBadge}>
              <View style={styles.healthDot} />
              <Text style={styles.healthBadgeText}>OPERATIONAL</Text>
            </View>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{formatNumber(stats?.plays_today || 0)}</Text>
              <Text style={styles.healthStatLabel}>Plays Today</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{stats?.new_users_today || 0}</Text>
              <Text style={styles.healthStatLabel}>New Users</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{stats?.new_tracks_today || 0}</Text>
              <Text style={styles.healthStatLabel}>New Tracks</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Platform Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            label="Total Users"
            value={formatNumber(stats?.total_users || 0)}
            color="#60A5FA"
          />
          <StatCard
            icon="mic"
            label="Artists"
            value={formatNumber(stats?.total_artists || 0)}
            color="#10B981"
          />
          <StatCard
            icon="headset"
            label="Listeners"
            value={formatNumber(stats?.total_listeners || 0)}
            color="#8B5CF6"
          />
          <StatCard
            icon="musical-notes"
            label="Tracks"
            value={formatNumber(stats?.total_tracks || 0)}
            color="#F59E0B"
          />
          <StatCard
            icon="play"
            label="Total Plays"
            value={formatNumber(stats?.total_plays || 0)}
            color="#EC4899"
          />
          <StatCard
            icon="card"
            label="Subscriptions"
            value={formatNumber(stats?.active_subscriptions || 0)}
            color="#14B8A6"
          />
        </View>

        {/* Financial Overview */}
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Total Revenue</Text>
              <Text style={styles.financialValue}>${formatCurrency(stats?.total_revenue || 0)}</Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Pending Payouts</Text>
              <Text style={[styles.financialValue, styles.pendingValue]}>
                ${formatCurrency(stats?.pending_payouts || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Items */}
        <Text style={styles.sectionTitle}>Requires Attention</Text>
        <View style={styles.actionsContainer}>
          <ActionCard
            icon="document-text"
            label="Pending Reviews"
            value={stats?.pending_reviews || 0}
            color="#F59E0B"
            onPress={() => openWebAdmin('review')}
          />
          <ActionCard
            icon="cash"
            label="Process Payouts"
            value={stats?.pending_payouts || 0}
            color="#10B981"
            onPress={() => openWebAdmin('payouts')}
            isAmount
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="shield-checkmark"
            label="Moderation"
            onPress={() => openWebAdmin('moderation')}
          />
          <QuickActionButton
            icon="warning"
            label="Fraud Detection"
            onPress={() => openWebAdmin('fraud')}
          />
          <QuickActionButton
            icon="analytics"
            label="Analytics"
            onPress={() => openWebAdmin('analytics')}
          />
          <QuickActionButton
            icon="people"
            label="Users"
            onPress={() => openWebAdmin('users')}
          />
          <QuickActionButton
            icon="musical-note"
            label="Audio Analysis"
            onPress={() => openWebAdmin('audio-analysis')}
          />
          <QuickActionButton
            icon="server"
            label="Kernel Health"
            onPress={() => openWebAdmin('kernel-health')}
          />
        </View>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {activity.map((item) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) }]}>
                    <Ionicons name={getActivityIcon(item.type)} size={16} color="#fff" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{item.description}</Text>
                    <Text style={styles.activityTime}>{formatTime(item.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

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

function ActionCard({ icon, label, value, color, onPress, isAmount }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  onPress: () => void;
  isAmount?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={[styles.actionValue, { color }]}>
          {isAmount ? `$${formatCurrency(value)}` : value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
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

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getActivityIcon(type: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    play: 'play',
    signup: 'person-add',
    upload: 'cloud-upload',
    subscription: 'card',
    review: 'document-text',
  };
  return icons[type] || 'ellipse';
}

function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    play: '#60A5FA',
    signup: '#10B981',
    upload: '#8B5CF6',
    subscription: '#F59E0B',
    review: '#EC4899',
  };
  return colors[type] || theme.colors.textMuted;
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
  accessDeniedText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.lg,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
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
  pendingValue: {
    color: theme.colors.warning,
  },
  actionsContainer: {
    gap: theme.spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  actionValue: {
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
  activityList: {
    gap: theme.spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  activityTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
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
