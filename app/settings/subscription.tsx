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
  Animated,
  Dimensions,
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

const { width } = Dimensions.get('window');

const TIER_COLORS = {
  basic: ['#4A5568', '#2D3748'] as const,
  premium: ['#B8860B', '#8B6914', '#654C0C'] as const,
};

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ success?: string; canceled?: string }>();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('premium');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('yearly');

  const isArtist = user?.type === 'artist';

  useEffect(() => {
    fetchStatus();
  }, []);

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

  const getMonthlyEquivalent = () => {
    if (billingInterval === 'monthly') return getCurrentPlanPrice();
    return (getCurrentPlanPrice() / 12).toFixed(2);
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

      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'palletium://settings/subscription'
      );

      if (result.type === 'success') {
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['rgba(184, 134, 11, 0.15)', 'transparent']}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="diamond" size={48} color={theme.colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Unlock Premium Features</Text>
          <Text style={styles.heroSubtitle}>
            {isArtist
              ? 'Unlock $1.00/play rate from subscribed listeners'
              : 'Earn rewards while you listen'}
          </Text>
        </LinearGradient>

        {/* Current Status Banner (if subscribed) */}
        {isSubscribed && (
          <View style={styles.statusBanner}>
            <View style={styles.statusBannerContent}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
              <View style={styles.statusBannerText}>
                <Text style={styles.statusBannerTitle}>
                  {status?.plan?.name || 'Premium'} Active
                </Text>
                <Text style={styles.statusBannerSubtitle}>
                  {status?.cancelAtPeriodEnd ? 'Cancels at period end' : `$${status?.plan?.price}/${status?.plan?.interval}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.manageButtonText}>Manage</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Billing Toggle */}
        {!isSubscribed && !isArtist && (
          <View style={styles.billingToggleContainer}>
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
                {billingInterval === 'yearly' && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>SAVE 17%</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Plan Cards */}
        {!isSubscribed && !isArtist && (
          <View style={styles.planCardsContainer}>
            {/* Basic Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'basic' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('basic')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedPlan === 'basic' ? TIER_COLORS.basic : ['transparent', 'transparent']}
                style={styles.planCardGradient}
              >
                <View style={styles.planCardHeader}>
                  <Text style={styles.planCardName}>Basic</Text>
                  {selectedPlan === 'basic' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                    </View>
                  )}
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceCurrency}>$</Text>
                  <Text style={styles.priceAmount}>
                    {billingInterval === 'monthly' ? '9.99' : '8.25'}
                  </Text>
                  <Text style={styles.pricePeriod}>/mo</Text>
                </View>
                {billingInterval === 'yearly' && (
                  <Text style={styles.billedText}>$99 billed yearly</Text>
                )}

                <View style={styles.featureList}>
                  <FeatureItem text="Uninterrupted listening" included />
                  <FeatureItem text="Earn listener rewards" included />
                  <FeatureItem text="Offline downloads" included />
                  <FeatureItem text="High-quality audio" included />
                  <FeatureItem text="1.5× rewards bonus" included={false} />
                  <FeatureItem text="Early access" included={false} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Premium Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'premium' && styles.planCardSelected,
                styles.planCardPremium,
              ]}
              onPress={() => setSelectedPlan('premium')}
              activeOpacity={0.8}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>

              <LinearGradient
                colors={selectedPlan === 'premium' ? TIER_COLORS.premium : ['transparent', 'transparent']}
                style={styles.planCardGradient}
              >
                <View style={styles.planCardHeader}>
                  <Text style={[styles.planCardName, styles.planCardNamePremium]}>Premium</Text>
                  {selectedPlan === 'premium' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                    </View>
                  )}
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceCurrency}>$</Text>
                  <Text style={styles.priceAmount}>
                    {billingInterval === 'monthly' ? '14.99' : '12.42'}
                  </Text>
                  <Text style={styles.pricePeriod}>/mo</Text>
                </View>
                {billingInterval === 'yearly' && (
                  <Text style={styles.billedText}>$149 billed yearly</Text>
                )}

                <View style={styles.featureList}>
                  <FeatureItem text="Everything in Basic" included highlight />
                  <FeatureItem text="1.5× rewards earnings" included highlight />
                  <FeatureItem text="Early access to releases" included />
                  <FeatureItem text="Exclusive content" included />
                  <FeatureItem text="Priority support" included />
                  <FeatureItem text="Premium badge" included />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Artist Verification Card */}
        {!isSubscribed && isArtist && (
          <View style={styles.artistProContainer}>
            <LinearGradient
              colors={['#1A472A', '#0D2818']}
              style={styles.artistProCard}
            >
              <View style={styles.artistProHeader}>
                <Ionicons name="mic" size={32} color="#10B981" />
                <Text style={styles.artistProTitle}>Artist Verification</Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceAmount}>49.99</Text>
                <Text style={styles.pricePeriod}>/year</Text>
              </View>
              <Text style={styles.billedText}>Just $4.17/month</Text>

              <View style={styles.artistProFeatures}>
                <View style={styles.artistProFeatureRow}>
                  <View style={styles.artistProFeature}>
                    <Ionicons name="cash" size={24} color="#10B981" />
                    <Text style={styles.artistProFeatureText}>$1.00/Play</Text>
                    <Text style={styles.artistProFeatureSubtext}>From subscribed listeners</Text>
                  </View>
                  <View style={styles.artistProFeature}>
                    <Ionicons name="analytics" size={24} color="#10B981" />
                    <Text style={styles.artistProFeatureText}>Analytics</Text>
                    <Text style={styles.artistProFeatureSubtext}>Advanced insights</Text>
                  </View>
                </View>
                <View style={styles.artistProFeatureRow}>
                  <View style={styles.artistProFeature}>
                    <Ionicons name="megaphone" size={24} color="#10B981" />
                    <Text style={styles.artistProFeatureText}>Promo Tools</Text>
                    <Text style={styles.artistProFeatureSubtext}>Reach more fans</Text>
                  </View>
                  <View style={styles.artistProFeature}>
                    <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                    <Text style={styles.artistProFeatureText}>Verified</Text>
                    <Text style={styles.artistProFeatureSubtext}>Artist badge</Text>
                  </View>
                </View>
              </View>

              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonTitle}>vs Unverified</Text>
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonLabel}>First Listen Rate</Text>
                  <Text style={styles.comparisonFree}>$0.004</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.comparisonPro}>$1.00</Text>
                </View>
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonLabel}>Upload Limit</Text>
                  <Text style={styles.comparisonFree}>3</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.comparisonPro}>∞</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* CTA Button */}
        {!isSubscribed && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleCheckout}
            disabled={checkoutLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.colors.accent, '#8B6914']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {checkoutLoading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {isArtist
                      ? 'Get Verified'
                      : `Get ${selectedPlan === 'premium' ? 'Premium' : 'Basic'}`}
                  </Text>
                  <Text style={styles.ctaPrice}>
                    ${getCurrentPlanPrice()}/{billingInterval === 'monthly' ? 'mo' : 'yr'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Already Subscribed Message */}
        {isSubscribed && isPremium && (
          <View style={styles.thanksSection}>
            <LinearGradient
              colors={['rgba(184, 134, 11, 0.2)', 'transparent']}
              style={styles.thanksCard}
            >
              <Ionicons name="heart" size={48} color={theme.colors.accent} />
              <Text style={styles.thanksTitle}>You're Premium!</Text>
              <Text style={styles.thanksText}>
                Thank you for supporting independent artists. You're enjoying all the best features Palletium has to offer.
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancel anytime. Secure payment via Stripe.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureItem = ({ text, included, highlight }: { text: string; included: boolean; highlight?: boolean }) => (
  <View style={styles.featureItem}>
    <Ionicons
      name={included ? 'checkmark-circle' : 'close-circle'}
      size={18}
      color={included ? (highlight ? theme.colors.accent : theme.colors.success) : theme.colors.textMuted}
    />
    <Text style={[
      styles.featureText,
      !included && styles.featureTextDisabled,
      highlight && styles.featureTextHighlight,
    ]}>
      {text}
    </Text>
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusBannerText: {},
  statusBannerTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  statusBannerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  manageButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  manageButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  billingToggleContainer: {
    marginBottom: theme.spacing.lg,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  billingOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  billingText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  billingTextSelected: {
    color: theme.colors.background,
  },
  savingsBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planCardsContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  planCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: theme.colors.accent,
  },
  planCardPremium: {
    position: 'relative',
  },
  planCardGradient: {
    padding: theme.spacing.lg,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  planCardName: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  planCardNamePremium: {
    color: theme.colors.accent,
  },
  selectedIndicator: {},
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: theme.borderRadius.md,
    zIndex: 1,
  },
  popularBadgeText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceCurrency: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  pricePeriod: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  billedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  featureList: {
    gap: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  featureTextDisabled: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  featureTextHighlight: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  artistProContainer: {
    marginBottom: theme.spacing.lg,
  },
  artistProCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  artistProHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  artistProTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: '#10B981',
  },
  artistProFeatures: {
    gap: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  artistProFeatureRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  artistProFeature: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  artistProFeatureText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
  },
  artistProFeatureSubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
  },
  comparisonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  comparisonTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  comparisonLabel: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  comparisonFree: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    width: 40,
    textAlign: 'center',
  },
  comparisonPro: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: theme.fontSize.sm,
    width: 40,
    textAlign: 'center',
  },
  ctaButton: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  ctaText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  ctaPrice: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  thanksSection: {
    marginBottom: theme.spacing.lg,
  },
  thanksCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  thanksTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  thanksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
  },
  footerDot: {
    color: theme.colors.textMuted,
  },
});
