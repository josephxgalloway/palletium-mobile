import { RoleGate } from '@/components/RoleGate';
import { theme } from '@/constants/theme';
import {
  getFraudReports,
  getContentModeration,
} from '@/lib/api/admin.service';
import type { FraudReport, ContentModeration } from '@/lib/api/admin.service';
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

// Gate: admin-only — no data hooks fire before RoleGate resolves
export default function AdminTrustPage() {
  return (
    <RoleGate allow={['admin']}>
      <AdminTrustTab />
    </RoleGate>
  );
}

function AdminTrustTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fraud, setFraud] = useState<FraudReport | null>(null);
  const [moderation, setModeration] = useState<ContentModeration | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fraudRes, modRes] = await Promise.all([
        getFraudReports().catch(() => null),
        getContentModeration().catch(() => null),
      ]);
      if (fraudRes) setFraud(fraudRes);
      if (modRes) setModeration(modRes);
    } catch (error) {
      console.error('Failed to load trust data:', error);
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

  const highRisk = fraud?.highRiskCount ?? 0;
  const bannerColor = highRisk > 0 ? ['#5F1E1E', '#330D0D'] : ['#1E3A5F', '#0D1F33'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trust & Safety</Text>
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
        {/* Fraud Overview Banner */}
        <LinearGradient colors={bannerColor as [string, string]} style={styles.fraudBanner}>
          <View style={styles.fraudHeader}>
            <Ionicons name="shield" size={24} color={highRisk > 0 ? '#F87171' : '#60A5FA'} />
            <Text style={styles.fraudTitle}>Fraud Detection</Text>
            {highRisk > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{highRisk} HIGH RISK</Text>
              </View>
            )}
          </View>
          <View style={styles.fraudStats}>
            <View style={styles.fraudStatItem}>
              <Text style={[styles.fraudStatValue, highRisk > 0 && { color: '#F87171' }]}>
                {highRisk}
              </Text>
              <Text style={styles.fraudStatLabel}>High Risk</Text>
            </View>
            <View style={styles.fraudStatItem}>
              <Text style={styles.fraudStatValue}>{fraud?.flaggedUsers ?? 0}</Text>
              <Text style={styles.fraudStatLabel}>Flagged Users</Text>
            </View>
            <View style={styles.fraudStatItem}>
              <Text style={styles.fraudStatValue}>{formatNumber(fraud?.totalActivities ?? 0)}</Text>
              <Text style={styles.fraudStatLabel}>Analyzed</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Risk Categories */}
        <Text style={styles.sectionTitle}>Risk Categories</Text>
        <View style={styles.riskGrid}>
          <RiskCard
            icon="musical-notes"
            label="Suspicious Playing"
            count={fraud?.riskCategories?.suspiciousPlaying ?? 0}
            color="#F59E0B"
          />
          <RiskCard
            icon="hardware-chip"
            label="Bot Behavior"
            count={fraud?.riskCategories?.botBehavior ?? 0}
            color="#F87171"
          />
          <RiskCard
            icon="globe"
            label="Multiple IPs"
            count={fraud?.riskCategories?.multipleIPs ?? 0}
            color="#8B5CF6"
          />
        </View>

        {/* Content Moderation */}
        <Text style={styles.sectionTitle}>Content Moderation</Text>
        <View style={styles.moderationCards}>
          <View style={styles.moderationCard}>
            <View style={[styles.moderationIcon, { backgroundColor: '#F59E0B33' }]}>
              <Ionicons name="time" size={24} color="#F59E0B" />
            </View>
            <View style={styles.moderationContent}>
              <Text style={styles.moderationLabel}>Pending Review</Text>
              <Text style={[styles.moderationValue, { color: '#F59E0B' }]}>
                {moderation?.totalPending ?? 0}
              </Text>
            </View>
          </View>
          <View style={styles.moderationCard}>
            <View style={[styles.moderationIcon, { backgroundColor: '#F8717133' }]}>
              <Ionicons name="flag" size={24} color="#F87171" />
            </View>
            <View style={styles.moderationContent}>
              <Text style={styles.moderationLabel}>Flagged Content</Text>
              <Text style={[styles.moderationValue, { color: '#F87171' }]}>
                {moderation?.flaggedContent?.length ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Flags */}
        {(fraud?.recentFlags?.length ?? 0) > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Flags</Text>
            <View style={styles.flagsList}>
              {fraud!.recentFlags.slice(0, 10).map((flag) => (
                <View key={flag.id} style={styles.flagCard}>
                  <View style={styles.flagHeader}>
                    <View style={[
                      styles.riskDot,
                      { backgroundColor: flag.fraudRisk.riskScore >= 80 ? '#F87171' : flag.fraudRisk.riskScore >= 50 ? '#F59E0B' : '#60A5FA' },
                    ]} />
                    <Text style={styles.flagUser} numberOfLines={1}>{flag.user?.name || flag.user?.email || `User ${flag.user_id}`}</Text>
                    <Text style={styles.flagScore}>Risk: {flag.fraudRisk.riskScore}</Text>
                  </View>
                  {flag.fraudRisk.reasons?.length > 0 && (
                    <Text style={styles.flagReasons} numberOfLines={2}>
                      {flag.fraudRisk.reasons.join(', ')}
                    </Text>
                  )}
                  <Text style={styles.flagDate}>{new Date(flag.played_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Detailed Views</Text>
        <View style={styles.linkCards}>
          <TouchableOpacity style={styles.linkCard} onPress={() => openWebAdmin('trust-safety')}>
            <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
            <Text style={styles.linkCardText}>Full Trust & Safety Dashboard</Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkCard} onPress={() => openWebAdmin('ai-monitoring')}>
            <Ionicons name="scan" size={22} color={theme.colors.primary} />
            <Text style={styles.linkCardText}>AI Content Monitoring</Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function RiskCard({ icon, label, count, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={styles.riskCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.riskCount, { color }]}>{count}</Text>
      <Text style={styles.riskLabel}>{label}</Text>
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
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
  fraudBanner: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  fraudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fraudTitle: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertBadge: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F87171',
  },
  fraudStats: {
    flexDirection: 'row',
  },
  fraudStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fraudStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  fraudStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  riskGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  riskCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  riskCount: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    marginTop: theme.spacing.xs,
  },
  riskLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  moderationCards: {
    gap: theme.spacing.sm,
  },
  moderationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  moderationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moderationContent: {
    flex: 1,
  },
  moderationLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  moderationValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  flagsList: {
    gap: theme.spacing.sm,
  },
  flagCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  flagUser: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  flagScore: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  flagReasons: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  flagDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  linkCards: {
    gap: theme.spacing.sm,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  linkCardText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
