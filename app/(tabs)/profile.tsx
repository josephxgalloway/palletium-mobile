import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useNetworkStore } from '@/lib/store/networkStore';
import type { DashboardStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isConnected } = useNetworkStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated || !isConnected) return;

    try {
      const response = await api.get('/users/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, [isAuthenticated, isConnected]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchDashboard().finally(() => setLoading(false));
    }
  }, [isAuthenticated, fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const handleLogout = async () => {
    await logout();
  };

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={theme.colors.textMuted} />
          <Text style={styles.authTitle}>Sign in to Palletium</Text>
          <Text style={styles.authSubtitle}>
            Track your earnings, rewards, and listening history
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isArtist = user.type === 'artist';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Offline Banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color={theme.colors.warning} />
            <Text style={styles.offlineText}>You're offline</Text>
          </View>
        )}

        {/* Profile Header */}
        <View style={styles.header}>
          {user.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{user.name || 'Palletium User'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Ionicons
              name={isArtist ? 'musical-notes' : 'headset'}
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.badgeText}>
              {isArtist ? 'Artist' : 'Listener'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.statsGrid}>
            {isArtist ? (
              <>
                <StatCard
                  icon="cash"
                  label="Total Earnings"
                  value={`$${(stats?.total_earnings || 0).toFixed(2)}`}
                  color={theme.colors.success}
                />
                <StatCard
                  icon="hourglass"
                  label="Pending"
                  value={`$${(stats?.pending_earnings || 0).toFixed(2)}`}
                  color={theme.colors.warning}
                />
                <StatCard
                  icon="play"
                  label="Total Plays"
                  value={formatNumber(stats?.total_plays || 0)}
                  color={theme.colors.primary}
                />
                <StatCard
                  icon="people"
                  label="Listeners"
                  value={formatNumber(stats?.unique_listeners || 0)}
                  color={theme.colors.accent}
                />
                <StatCard
                  icon="musical-note"
                  label="Tracks"
                  value={stats?.track_count?.toString() || '0'}
                  color={theme.colors.primary}
                />
                <StatCard
                  icon="trending-up"
                  label="Level"
                  value={stats?.current_level?.toString() || '1'}
                  color={theme.colors.accent}
                />
              </>
            ) : (
              <>
                <StatCard
                  icon="gift"
                  label="Rewards Earned"
                  value={`$${(stats?.total_rewards || 0).toFixed(2)}`}
                  color={theme.colors.success}
                  onPress={() => router.push('/stats/dividends')}
                />
                <StatCard
                  icon="compass"
                  label="Discoveries"
                  value={formatNumber(stats?.discovery_count || 0)}
                  color={theme.colors.accent}
                />
                <StatCard
                  icon="play"
                  label="Plays"
                  value={formatNumber(stats?.play_count || 0)}
                  color={theme.colors.primary}
                />
                <StatCard
                  icon="star"
                  label="XP"
                  value={formatNumber(stats?.total_xp || 0)}
                  color={theme.colors.warning}
                />
                <StatCard
                  icon="trophy"
                  label="Tier"
                  value={stats?.current_tier || 'Bronze'}
                  color={theme.colors.accent}
                />
                <StatCard
                  icon="flash"
                  label="Progress"
                  value={`${stats?.tier_progress || 0}%`}
                  color={theme.colors.primary}
                />
              </>
            )}
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menu}>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => {/* TODO */ }}
          />
          <MenuItem
            icon="card-outline"
            label="Subscription"
            sublabel={user.subscription_status === 'active' ? 'Premium' : 'Free'}
            onPress={() => {/* TODO */ }}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {/* TODO */ }}
          />
          <MenuItem
            icon="information-circle-outline"
            label="About"
            onPress={() => {/* TODO */ }}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Palletium v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function StatCard({ icon, label, value, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const Content = (
    <>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress}>
        {Content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.statCard}>
      {Content}
    </View>
  );
}

function MenuItem({ icon, label, sublabel, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuItemSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  offlineText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  authTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  authSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  signInText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  registerButton: {
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  registerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  loader: {
    marginVertical: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
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
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  menu: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  menuItemLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  menuItemSublabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
});
