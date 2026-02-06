import { theme } from '@/constants/theme';
import {
  getFinancialMetrics,
  getProofMetrics,
} from '@/lib/api/admin.service';
import type { FinancialMetrics, ProofMetrics } from '@/lib/api/admin.service';
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

export default function AdminPaymentsTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financial, setFinancial] = useState<FinancialMetrics | null>(null);
  const [proof, setProof] = useState<ProofMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [financialRes, proofRes] = await Promise.all([
        getFinancialMetrics().catch(() => null),
        getProofMetrics().catch(() => null),
      ]);
      if (financialRes) setFinancial(financialRes);
      if (proofRes) setProof(proofRes);
    } catch (error) {
      console.error('Failed to load payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const margin = financial?.metrics?.profitMargin ?? 0;
  const marginColor = margin >= 0 ? '#10B981' : '#F87171';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
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
        {/* Revenue Banner */}
        <LinearGradient colors={['#1E5F3A', '#0D331F']} style={styles.revenueBanner}>
          <View style={styles.revenueHeader}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.revenueTitle}>Revenue Overview</Text>
          </View>
          <View style={styles.revenueStats}>
            <View style={styles.revenueStatItem}>
              <Text style={styles.revenueStatValue}>${fmt(financial?.revenue?.gross ?? 0)}</Text>
              <Text style={styles.revenueStatLabel}>Gross</Text>
            </View>
            <View style={styles.revenueStatItem}>
              <Text style={styles.revenueStatValue}>${fmt(financial?.revenue?.net ?? 0)}</Text>
              <Text style={styles.revenueStatLabel}>Net</Text>
            </View>
            <View style={styles.revenueStatItem}>
              <Text style={[styles.revenueStatValue, { color: marginColor }]}>
                {margin.toFixed(1)}%
              </Text>
              <Text style={styles.revenueStatLabel}>Margin</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Costs Breakdown */}
        <Text style={styles.sectionTitle}>Costs Breakdown</Text>
        <View style={styles.costsCard}>
          <View style={styles.costRow}>
            <View style={styles.costDot}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.costLabel}>Artist Payments</Text>
            <Text style={styles.costValue}>${fmt(financial?.costs?.artistPayments ?? 0)}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <View style={styles.costDot}>
              <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />
            </View>
            <Text style={styles.costLabel}>Listener Rewards</Text>
            <Text style={styles.costValue}>${fmt(financial?.costs?.listenerDividends ?? 0)}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <View style={styles.costDot}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={[styles.costLabel, { fontWeight: '700' }]}>Total</Text>
            <Text style={[styles.costValue, { fontWeight: '700' }]}>
              ${fmt(financial?.costs?.total ?? 0)}
            </Text>
          </View>
        </View>

        {/* Proof of Earnings */}
        <Text style={styles.sectionTitle}>Proof of Earnings</Text>
        <View style={styles.proofGrid}>
          <ProofCard icon="people" label="Verified Artists" value={proof?.verified_artists ?? 0} color="#60A5FA" />
          <ProofCard icon="musical-notes" label="Approved Tracks" value={proof?.approved_tracks ?? 0} color="#10B981" />
          <ProofCard icon="headset" label="First Listens" value={proof?.first_listens ?? 0} color="#8B5CF6" />
          <ProofCard icon="cash" label="Settled Payouts" value={proof?.settled_payouts ?? 0} color="#10B981" isCurrency />
          <ProofCard icon="gift" label="Total Rewards" value={proof?.total_rewards ?? 0} color="#A855F6" isCurrency />
        </View>

        {/* 30-Day Liability */}
        <Text style={styles.sectionTitle}>30-Day Metrics</Text>
        <View style={styles.liabilityCard}>
          <View style={styles.liabilityRow}>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Premium First Listens</Text>
              <Text style={styles.liabilityValue}>{(proof?.premium_first_listens_30d ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Base-Rate Plays</Text>
              <Text style={styles.liabilityValue}>{(proof?.base_rate_plays_30d ?? 0).toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.liabilityRow}>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Payout Liability</Text>
              <Text style={[styles.liabilityValue, { color: '#F59E0B' }]}>
                ${fmt(proof?.payout_liability_30d ?? 0)}
              </Text>
            </View>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Reward Liability</Text>
              <Text style={[styles.liabilityValue, { color: '#F59E0B' }]}>
                ${fmt(proof?.reward_liability_30d ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Tier Reference */}
        <Text style={styles.sectionTitle}>Payment Tiers</Text>
        <View style={styles.tierCard}>
          <TierRow label="First Listen (verified)" rate="$1.00" color="#10B981" />
          <View style={styles.costDivider} />
          <TierRow label="Repeat Listen (verified)" rate="$0.01" color="#60A5FA" />
          <View style={styles.costDivider} />
          <TierRow label="AI / Unverified Tier" rate="$0.004" color="#F59E0B" />
        </View>

        {/* Web Link */}
        <TouchableOpacity
          style={styles.webLink}
          onPress={() => Linking.openURL('https://palletium.com/admin/payments')}
        >
          <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.webLinkText}>Open Financial Dashboard</Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function ProofCard({ icon, label, value, color, isCurrency }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  isCurrency?: boolean;
}) {
  return (
    <View style={styles.proofCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.proofValue, { color }]}>
        {isCurrency ? `$${fmt(value)}` : value.toLocaleString()}
      </Text>
      <Text style={styles.proofLabel}>{label}</Text>
    </View>
  );
}

function TierRow({ label, rate, color }: { label: string; rate: string; color: string }) {
  return (
    <View style={styles.tierRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.tierLabel}>{label}</Text>
      <Text style={[styles.tierRate, { color }]}>{rate}</Text>
    </View>
  );
}

function fmt(num: number): string {
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
  revenueBanner: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  revenueTitle: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  revenueStats: {
    flexDirection: 'row',
  },
  revenueStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  revenueStatLabel: {
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
  costsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  costDot: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  costLabel: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  costValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  costDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  proofGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  proofCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  proofValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    marginTop: theme.spacing.xs,
  },
  proofLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  liabilityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  liabilityRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
  },
  liabilityItem: {
    flex: 1,
    alignItems: 'center',
  },
  liabilityLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  liabilityValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  tierCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tierLabel: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  tierRate: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  webLinkText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
