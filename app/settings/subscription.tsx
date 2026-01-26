import { theme } from '@/constants/theme';
import {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  getCustomerPortal,
  getSubscriptionStatus,
  SubscriptionStatus,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type PlanType = 'basic' | 'premium';
type BillingInterval = 'monthly' | 'yearly';

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ success?: string; canceled?: string }>();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basic');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const isArtist = user?.type === 'artist';

  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle deep link results
  useEffect(() => {
    if (params.success === 'true') {
      Toast.show({
        type: 'success',
        text1: 'Subscription activated!',
        text2: 'Welcome to Palletium Premium',
      });
      fetchStatus();
    } else if (params.canceled === 'true') {
      Toast.show({
        type: 'info',
        text1: 'Checkout canceled',
        text2: 'No changes were made',
      });
    }
  }, [params]);

  const fetchStatus = async () => {
    try {
      const data = await getSubscriptionStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanId = useCallback(() => {
    if (isArtist) {
      return 'artist_pro_yearly';
    }
    return `listener_${selectedPlan}_${billingInterval === 'monthly' ? 'monthly' : 'yearly'}`;
  }, [isArtist, selectedPlan, billingInterval]);

  const getCurrentPlanPrice = () => {
    const planId = getPlanId();
    const plan = SUBSCRIPTION_PLANS[planId];
    return plan?.price || 0;
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const planId = getPlanId();
      const { url } = await createCheckoutSession(
        planId,
        'palletium://settings/subscription?success=true',
        'palletium://settings/subscription?canceled=true'
      );

      // Open Stripe checkout in browser
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'palletium://settings/subscription'
      );

      if (result.type === 'success') {
        // Refresh status after checkout
        await fetchStatus();
      }
    } catch (error: any) {
      console.error('Checkout failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Checkout failed',
        text2: error.message || error.response?.data?.error || 'Please try again later',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await getCustomerPortal('palletium://settings/subscription');

      await WebBrowser.openAuthSessionAsync(url, 'palletium://settings/subscription');

      // Refresh status after returning from portal
      await fetchStatus();
    } catch (error: any) {
      console.error('Portal failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to open billing portal',
        text2: error.message || error.response?.data?.error || 'Please try again later',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isSubscribed = status?.status === 'active' || status?.status === 'trialing';
  const isPremium = status?.plan?.id?.includes('premium');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Plan Card */}
        <View style={styles.currentPlanContainer}>
          <Text style={styles.sectionTitle}>CURRENT PLAN</Text>
          <View style={styles.planCard}>
            <View>
              <Text style={styles.planName}>
                {isSubscribed
                  ? status?.plan?.name || 'Premium'
                  : isArtist
                  ? 'Artist Starter (Free)'
                  : 'Free Listener'}
              </Text>
              <Text style={styles.planCost}>
                {isSubscribed
                  ? `$${status?.plan?.price}/${status?.plan?.interval}`
                  : 'Free'}
              </Text>
              {status?.cancelAtPeriodEnd && (
                <Text style={styles.cancelNotice}>Cancels at period end</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isSubscribed
                    ? theme.colors.success
                    : theme.colors.surfaceElevated,
                },
              ]}
            >
              <Text style={styles.statusText}>
                {status?.status === 'trialing'
                  ? 'TRIAL'
                  : isSubscribed
                  ? 'ACTIVE'
                  : 'FREE'}
              </Text>
            </View>
          </View>

          {/* Manage Subscription Button for active subscribers */}
          {isSubscribed && (
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="settings-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.manageButtonText}>Manage Subscription</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Upgrade Card - Show if not subscribed or can upgrade to premium */}
        {(!isSubscribed || (isSubscribed && !isPremium && !isArtist)) && (
          <LinearGradient
            colors={[theme.colors.surfaceElevated, theme.colors.surface]}
            style={styles.upgradeCard}
          >
            <View style={styles.upgradeHeader}>
              <Ionicons name="star" size={32} color={theme.colors.accent} />
              <Text style={styles.upgradeTitle}>
                {isArtist ? 'Upgrade to Artist Pro' : 'Upgrade to Premium'}
              </Text>
            </View>

            {/* Plan Selector (Listeners only) */}
            {!isArtist && !isSubscribed && (
              <View style={styles.planSelector}>
                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'basic' && styles.planOptionSelected,
                  ]}
                  onPress={() => setSelectedPlan('basic')}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      selectedPlan === 'basic' && styles.planOptionTextSelected,
                    ]}
                  >
                    Basic
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'premium' && styles.planOptionSelected,
                  ]}
                  onPress={() => setSelectedPlan('premium')}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      selectedPlan === 'premium' && styles.planOptionTextSelected,
                    ]}
                  >
                    Premium
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Billing Interval Toggle (Listeners only) */}
            {!isArtist && (
              <View style={styles.billingToggle}>
                <TouchableOpacity
                  style={[
                    styles.billingOption,
                    billingInterval === 'monthly' && styles.billingOptionSelected,
                  ]}
                  onPress={() => setBillingInterval('monthly')}
                >
                  <Text
                    style={[
                      styles.billingText,
                      billingInterval === 'monthly' && styles.billingTextSelected,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.billingOption,
                    billingInterval === 'yearly' && styles.billingOptionSelected,
                  ]}
                  onPress={() => setBillingInterval('yearly')}
                >
                  <Text
                    style={[
                      styles.billingText,
                      billingInterval === 'yearly' && styles.billingTextSelected,
                    ]}
                  >
                    Yearly
                  </Text>
                  <Text style={styles.savingsText}>Save 17%</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.featureList}>
              {isArtist ? (
                <>
                  <FeatureItem text="100% revenue share (0% platform fee)" />
                  <FeatureItem text="Advanced analytics dashboard" />
                  <FeatureItem text="Priority support" />
                  <FeatureItem text="Promotional tools" />
                  <FeatureItem text="Verified artist badge" />
                </>
              ) : selectedPlan === 'premium' ? (
                <>
                  <FeatureItem text="Unlimited ad-free streaming" />
                  <FeatureItem text="1.5× dividend earnings" />
                  <FeatureItem text="Early access to new releases" />
                  <FeatureItem text="Exclusive content" />
                  <FeatureItem text="Priority support" />
                </>
              ) : (
                <>
                  <FeatureItem text="Unlimited ad-free streaming" />
                  <FeatureItem text="Earn listening dividends" />
                  <FeatureItem text="Offline downloads" />
                  <FeatureItem text="High-quality audio" />
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.upgradeButtonText}>
                  {isArtist
                    ? 'Get Artist Pro - $19.99/year'
                    : `Get ${selectedPlan === 'premium' ? 'Premium' : 'Basic'} - $${getCurrentPlanPrice()}/${billingInterval === 'monthly' ? 'mo' : 'yr'}`}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>Cancel anytime. Terms apply.</Text>
          </LinearGradient>
        )}

        {/* Already Premium - Show Thanks */}
        {isSubscribed && isPremium && (
          <View style={styles.thanksCard}>
            <Ionicons name="heart" size={48} color={theme.colors.accent} />
            <Text style={styles.thanksTitle}>Thank you for being Premium!</Text>
            <Text style={styles.thanksText}>
              You're supporting independent artists and enjoying the best Palletium has to offer.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureItem = ({ text }: { text: string }) => (
  <View style={styles.featureItem}>
    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
  content: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  currentPlanContainer: {
    marginBottom: theme.spacing.xl,
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  planCost: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  cancelNotice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  manageButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  upgradeCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  upgradeTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  planOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  planOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  planOptionText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  planOptionTextSelected: {
    color: theme.colors.background,
  },
  billingToggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  billingOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  billingOptionSelected: {
    borderColor: theme.colors.primary,
  },
  billingText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  billingTextSelected: {
    color: theme.colors.textPrimary,
  },
  savingsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    marginTop: 2,
  },
  featureList: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  upgradeButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  upgradeButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  disclaimer: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
  },
  thanksCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  thanksTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  thanksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
