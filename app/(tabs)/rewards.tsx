import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Dividend {
  id: number;
  amount: number;
  dividend_type: 'discovery' | 'listen' | 'referral' | 'bonus' | 'tier_multiplier';
  source_title?: string;
  artist_name?: string;
  multiplier_applied: number;
  created_at: string;
}

interface RewardStats {
  total_earned: number;
  current_month: number;
  last_month: number;
  average_daily: number;
  total_discoveries: number;
  current_tier_multiplier: number;
  pending_amount: number;
}

const dividendTypeLabels: Record<string, string> = {
  discovery: 'New Discovery',
  listen: 'Track Listen',
  referral: 'Referral Bonus',
  bonus: 'Special Bonus',
  tier_multiplier: 'Tier Multiplier'
};

const dividendTypeColors: Record<string, string> = {
  discovery: theme.colors.accent,
  listen: theme.colors.success,
  referral: '#A855F7',
  bonus: theme.colors.warning,
  tier_multiplier: theme.colors.primary
};

const TIER_MULTIPLIERS = [
  { name: 'Bronze', multiplier: '1×', color: '#CD7F32' },
  { name: 'Silver', multiplier: '1.25×', color: '#C0C0C0' },
  { name: 'Gold', multiplier: '1.5×', color: '#FFD700' },
  { name: 'Platinum', multiplier: '1.75×', color: '#E5E4E2' },
  { name: 'Diamond', multiplier: '2×', color: '#B9F2FF' },
];

export default function RewardsScreen() {
  const { user } = useAuthStore();
  const { hasActiveListenerSubscription } = getUserEntitlements(user);
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isComingSoon, setIsComingSoon] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await api.get(`/dividends/user/${user.id}`);
      const data = response.data?.data || response.data;

      const history: Dividend[] = (data?.history || []).map((d: any, idx: number) => ({
        id: d.id || idx + 1,
        amount: Number(d.amount ?? 0),
        dividend_type: d.dividend_type || d.type || 'discovery',
        source_title: d.source_title || d.track_title,
        artist_name: d.artist_name,
        multiplier_applied: Number(d.multiplier_applied ?? d.tier_multiplier ?? 1.0),
        created_at: d.created_at || d.timestamp || new Date().toISOString(),
      }));

      // Calculate stats
      const now = new Date();
      const thisMonthKey = now.toISOString().slice(0, 7);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);

      const sumByMonth = (key: string) =>
        history.filter(d => d.created_at?.slice(0, 7) === key)
          .reduce((sum, d) => sum + d.amount, 0);

      const current_month = sumByMonth(thisMonthKey);
      const last_month = sumByMonth(lastMonthKey);

      const last30Total = history
        .filter(d => Date.now() - new Date(d.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000)
        .reduce((sum, d) => sum + d.amount, 0);

      setStats({
        total_earned: data?.totalEarned || history.reduce((sum, d) => sum + d.amount, 0),
        current_month,
        last_month,
        average_daily: last30Total / 30,
        total_discoveries: history.filter(d => d.dividend_type === 'discovery').length,
        current_tier_multiplier: data?.tierMultiplier || 1.0,
        pending_amount: data?.pendingAmount || 0,
      });

      setDividends(history);
      setIsComingSoon(false);
    } catch {
      // Show coming soon state for missing endpoints
      setIsComingSoon(true);
      setStats({
        total_earned: 0,
        current_month: 0,
        last_month: 0,
        average_daily: 0,
        total_discoveries: 0,
        current_tier_multiplier: 1.0,
        pending_amount: 0,
      });
      setDividends([]);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredDividends = dividends.filter(d => {
    if (selectedFilter === 'all') return true;
    return d.dividend_type === selectedFilter;
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatSmallCurrency = (amount: number) => `$${amount.toFixed(4)}`;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Hard paywall — unsubscribed users see only the gate, no stats/history
  if (!hasActiveListenerSubscription) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards</Text>
          <Text style={styles.headerSubtitle}>Listener rewards accrue from first listens on verified artists.</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.md }}>
          <View style={styles.paywallPanel}>
            <View style={styles.paywallIconContainer}>
              <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.paywallTitle}>Subscribe to Earn Rewards</Text>
            <Text style={styles.paywallText}>
              Listener rewards accrue from first listens on verified artists. Subscribe to start earning.
            </Text>
            <TouchableOpacity
              style={styles.paywallButton}
              onPress={() => router.push('/settings/subscription' as any)}
            >
              <Text style={styles.paywallButtonText}>View Plans</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const monthlyGrowth = stats && stats.last_month > 0
    ? ((stats.current_month - stats.last_month) / stats.last_month) * 100
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards</Text>
        <Text style={styles.headerSubtitle}>Listener rewards accrue from first listens on verified artists.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Coming Soon Banner */}
        {isComingSoon && (
          <View style={styles.comingSoonBanner}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <Text style={styles.comingSoonText}>
              Rewards tracking is coming soon! Keep listening to earn rewards.
            </Text>
          </View>
        )}

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>{formatCurrency(stats?.total_earned || 0)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color={theme.colors.accent} />
            <Text style={styles.statValue}>{formatCurrency(stats?.current_month || 0)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
            {monthlyGrowth !== 0 && (
              <View style={[
                styles.trendBadge,
                { backgroundColor: monthlyGrowth > 0 ? theme.colors.success + '20' : theme.colors.error + '20' }
              ]}>
                <Ionicons
                  name={monthlyGrowth > 0 ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={monthlyGrowth > 0 ? theme.colors.success : theme.colors.error}
                />
                <Text style={[
                  styles.trendText,
                  { color: monthlyGrowth > 0 ? theme.colors.success : theme.colors.error }
                ]}>
                  {Math.abs(monthlyGrowth).toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(stats?.average_daily || 0)}</Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="compass" size={20} color={theme.colors.accent} />
            <Text style={styles.statValue}>{(stats?.total_discoveries || 0).toString()}</Text>
            <Text style={styles.statLabel}>Discoveries</Text>
          </View>
        </View>

        {/* Tier Multiplier & Pending */}
        <View style={styles.cardsRow}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>Tier Multiplier</Text>
              <Ionicons name="flash" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.multiplierValue}>
              {stats?.current_tier_multiplier || 1.0}×
            </Text>
            <Text style={styles.infoCardSubtext}>on all rewards</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>Pending</Text>
              <Ionicons name="wallet" size={20} color={theme.colors.success} />
            </View>
            <Text style={[styles.multiplierValue, { color: theme.colors.success }]}>
              {formatCurrency(stats?.pending_amount || 0)}
            </Text>
            <Text style={styles.infoCardSubtext}>next payout</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'discovery', 'listen', 'referral', 'bonus'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  selectedFilter === filter && styles.filterTabActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === filter && styles.filterTabTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Rewards History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Rewards History</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredDividends.length} transaction{filteredDividends.length !== 1 ? 's' : ''}
          </Text>

          {filteredDividends.length > 0 ? (
            filteredDividends.slice(0, 15).map((dividend) => (
              <View key={dividend.id} style={styles.historyItem}>
                <View style={[
                  styles.historyIconContainer,
                  { backgroundColor: (dividendTypeColors[dividend.dividend_type] || theme.colors.primary) + '20' }
                ]}>
                  <Ionicons
                    name={dividend.dividend_type === 'discovery' ? 'compass' :
                      dividend.dividend_type === 'listen' ? 'play' :
                        dividend.dividend_type === 'referral' ? 'people' :
                          dividend.dividend_type === 'bonus' ? 'gift' : 'flash'}
                    size={18}
                    color={dividendTypeColors[dividend.dividend_type] || theme.colors.primary}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    {dividend.source_title || dividendTypeLabels[dividend.dividend_type] || 'Reward'}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {dividend.artist_name && `${dividend.artist_name} • `}
                    {new Date(dividend.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>
                    +{formatSmallCurrency(dividend.amount)}
                  </Text>
                  {dividend.multiplier_applied > 1 && (
                    <Text style={styles.historyMultiplier}>
                      {dividend.multiplier_applied}× bonus
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Rewards Yet</Text>
              <Text style={styles.emptySubtext}>
                Start discovering music to earn your first rewards!
              </Text>
            </View>
          )}
        </View>

        {/* How Rewards Work */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How Rewards Work</Text>

          <View style={styles.howItWorksGrid}>
            <View style={styles.howItWorksCard}>
              <Ionicons name="compass" size={20} color={theme.colors.accent} />
              <Text style={styles.howItWorksTitle}>Discovery Rewards</Text>
              <Text style={styles.howItWorksDesc}>Earn rewards when you discover new music. First listens count!</Text>
            </View>
            <View style={styles.howItWorksCard}>
              <Ionicons name="trending-up" size={20} color={theme.colors.success} />
              <Text style={styles.howItWorksTitle}>Tier Multipliers</Text>
              <Text style={styles.howItWorksDesc}>Higher tiers earn more rewards on every stream.</Text>
            </View>
            <View style={styles.howItWorksCard}>
              <Ionicons name="people" size={20} color="#A855F7" />
              <Text style={styles.howItWorksTitle}>Referral Bonuses</Text>
              <Text style={styles.howItWorksDesc}>Invite friends to earn bonus rewards when they join.</Text>
            </View>
            <View style={styles.howItWorksCard}>
              <Ionicons name="flash" size={20} color={theme.colors.warning} />
              <Text style={styles.howItWorksTitle}>Special Bonuses</Text>
              <Text style={styles.howItWorksDesc}>Complete challenges for special bonus rewards.</Text>
            </View>
          </View>

          {/* Tier Multiplier Breakdown */}
          <View style={styles.tierBreakdown}>
            <Text style={styles.tierBreakdownTitle}>Tier Multipliers</Text>
            <View style={styles.tierList}>
              {TIER_MULTIPLIERS.map((tier) => (
                <View key={tier.name} style={styles.tierItem}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={[styles.tierMultiplier, { color: tier.color }]}>
                    {tier.multiplier}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Earnings Calculation */}
          {stats && (
            <View style={styles.earningsCalc}>
              <Text style={styles.earningsCalcTitle}>Your Earnings Rate</Text>
              <View style={styles.earningsCalcRow}>
                <Text style={styles.earningsCalcLabel}>Base rate per discovery:</Text>
                <Text style={styles.earningsCalcValue}>$0.005</Text>
              </View>
              <View style={styles.earningsCalcRow}>
                <Text style={styles.earningsCalcLabel}>Your tier multiplier:</Text>
                <Text style={[styles.earningsCalcValue, { color: theme.colors.primary }]}>
                  {stats.current_tier_multiplier}×
                </Text>
              </View>
              <View style={styles.earningsCalcDivider} />
              <View style={styles.earningsCalcRow}>
                <Text style={styles.earningsCalcLabel}>Your rate per discovery:</Text>
                <Text style={[styles.earningsCalcValue, { color: theme.colors.success, fontSize: theme.fontSize.lg }]}>
                  ${(0.005 * stats.current_tier_multiplier).toFixed(4)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  comingSoonText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: theme.spacing.xs,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoCardTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  multiplierValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  infoCardSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  filterContainer: {
    marginBottom: theme.spacing.lg,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: theme.colors.background,
  },
  historySection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  historyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  historyMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  historyMultiplier: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  howItWorksSection: {
    marginBottom: theme.spacing.xl,
  },
  howItWorksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  howItWorksCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  howItWorksTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  howItWorksDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  tierBreakdown: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  tierBreakdownTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  tierList: {
    gap: theme.spacing.sm,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  tierName: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  tierMultiplier: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
  },
  earningsCalc: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  earningsCalcTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  earningsCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  earningsCalcLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  earningsCalcValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  earningsCalcDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  // Paywall
  paywallPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paywallIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  paywallTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  paywallText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  paywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  paywallButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});
