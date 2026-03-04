import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
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

export default function VerificationScreen() {
  const { user, checkAuth } = useAuthStore();
  const { isArtist, isVerifiedArtist } = getUserEntitlements(user);
  const [loading, setLoading] = useState(false);

  const handleStartVerification = async () => {
    setLoading(true);
    try {
      const response = await api.post('/verification/identity/create', {
        tier: 'standard',
      });

      const { session } = response.data;

      if (!session?.url && !session?.clientSecret) {
        throw new Error('No verification URL returned');
      }

      // Use the hosted verification URL from Stripe
      const verificationUrl =
        session.url ||
        `https://verify.stripe.com/start/${session.sessionId}`;

      const result = await WebBrowser.openBrowserAsync(verificationUrl, {
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // Refresh user state after verification flow completes
      await checkAuth();

      if (result.type === 'cancel') {
        Toast.show({
          type: 'info',
          text1: 'Verification paused',
          text2: 'You can resume anytime from Settings',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Verification submitted',
          text2: 'We\'ll notify you once it\'s approved',
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to start verification';
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Already verified
  if (isVerifiedArtist) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.verifiedContainer}>
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.03)']}
              style={styles.verifiedBadge}
            >
              <View style={styles.verifiedIconRing}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
              </View>
            </LinearGradient>
            <Text style={styles.verifiedTitle}>Verified Artist</Text>
            <Text style={styles.verifiedSubtitle}>
              Your identity has been confirmed. You have full access to all artist features.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Earning Rates</Text>
              <View style={styles.rateRow}>
                <View style={styles.rateItem}>
                  <Text style={styles.rateValue}>$1.00</Text>
                  <Text style={styles.rateLabel}>First listen</Text>
                </View>
                <View style={styles.rateDivider} />
                <View style={styles.rateItem}>
                  <Text style={styles.rateValue}>$0.01</Text>
                  <Text style={styles.rateLabel}>Repeat listen</Text>
                </View>
              </View>
              <Text style={styles.rateFootnote}>From subscribed listeners</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Benefits</Text>
              <BenefitRow icon="infinite" text="Unlimited track uploads" />
              <BenefitRow icon="search" text="Priority placement in discovery" />
              <BenefitRow icon="shield-checkmark" text="Verified badge on your profile" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Not yet an artist — must upload first
  if (!isArtist) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient
            colors={['rgba(251, 191, 36, 0.12)', 'transparent']}
            style={styles.heroSection}
          >
            <View style={[styles.heroIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
              <Ionicons name="musical-notes" size={40} color="#F59E0B" />
            </View>
            <Text style={styles.heroTitle}>Upload First</Text>
            <Text style={styles.heroSubtitle}>
              Upload your first track to become an artist, then verify your identity to unlock higher earning rates.
            </Text>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What Verification Unlocks</Text>
            <BenefitRow icon="trending-up" text="$1.00 per first listen from subscribed listeners" />
            <BenefitRow icon="infinite" text="Unlimited uploads (currently limited to 3)" />
            <BenefitRow icon="search" text="Priority placement in discovery" />
            <BenefitRow icon="shield-checkmark" text="Verified badge on your profile" />
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/upload' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.ctaText}>Upload Your First Track</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Artist, not verified — main verification flow
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.12)', 'transparent']}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>Get Verified</Text>
          <Text style={styles.heroSubtitle}>
            Confirm your identity to unlock higher earning rates, unlimited uploads, and priority discovery.
          </Text>
        </LinearGradient>

        {/* Rate comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.cardTitle}>Earning Rate Upgrade</Text>
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonSide}>
              <Text style={styles.comparisonSideLabel}>Now</Text>
              <Text style={styles.comparisonCurrentRate}>{'<1¢'}</Text>
              <Text style={styles.comparisonSideDetail}>per play</Text>
            </View>
            <View style={styles.comparisonArrow}>
              <Ionicons name="arrow-forward" size={20} color="#10B981" />
            </View>
            <View style={styles.comparisonSide}>
              <Text style={styles.comparisonSideLabel}>Verified</Text>
              <Text style={styles.comparisonVerifiedRate}>$1.00</Text>
              <Text style={styles.comparisonSideDetail}>first listen</Text>
            </View>
          </View>
          <Text style={styles.comparisonNote}>
            Plus $0.01 per repeat listen from subscribed listeners
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What You Unlock</Text>
          <BenefitRow icon="trending-up" text="250x higher first-listen rate" />
          <BenefitRow icon="infinite" text="Unlimited uploads (currently limited to 3)" />
          <BenefitRow icon="search" text="Priority placement in discovery" />
          <BenefitRow icon="shield-checkmark" text="Verified badge on your profile" />
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How It Works</Text>
          <StepRow number="1" text="Upload a government-issued ID (passport, driver's license, or national ID)" />
          <StepRow number="2" text="Take a quick selfie for identity matching" />
          <StepRow number="3" text="Stripe verifies your identity securely" />
          <StepRow number="4" text="Your account is upgraded once approved" />
        </View>

        {/* Pricing */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.02)']}
          style={styles.pricingCard}
        >
          <Text style={styles.pricingAmount}>$49.99</Text>
          <Text style={styles.pricingPeriod}>per year</Text>
          <View style={styles.pricingDivider} />
          <Text style={styles.pricingMonthly}>$4.17/month</Text>
          <Text style={styles.pricingIncludes}>
            Includes identity verification and all verified artist benefits
          </Text>
        </LinearGradient>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.infoNoteText}>
            Verification unlocks artist earning rates and uploads. Listener rewards require a separate subscription.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartVerification}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.ctaText}>Start Verification</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIconContainer}>
        <Ionicons name={icon} size={16} color="#10B981" />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.08)']}
        style={styles.stepNumber}
      >
        <Text style={styles.stepNumberText}>{number}</Text>
      </LinearGradient>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },

  // ── Verified state ──
  verifiedContainer: {
    alignItems: 'center',
  },
  verifiedBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  verifiedIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  verifiedSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#10B981',
  },
  rateLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rateDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
  },
  rateFootnote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // ── Hero ──
  heroSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 22,
  },

  // ── Cards ──
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    width: '100%',
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.2,
  },

  // ── Benefits ──
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 14,
  },
  benefitIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },

  // ── Rate comparison ──
  comparisonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  comparisonSide: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  comparisonSideLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  comparisonCurrentRate: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  comparisonVerifiedRate: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: '#10B981',
  },
  comparisonSideDetail: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  comparisonArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // ── Steps ──
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: '#10B981',
  },
  stepText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },

  // ── Pricing ──
  pricingCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  pricingAmount: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  pricingPeriod: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pricingDivider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    marginVertical: theme.spacing.md,
  },
  pricingMonthly: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#10B981',
  },
  pricingIncludes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },

  // ── Info note ──
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoNoteText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  // ── CTA ──
  ctaButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: theme.spacing.sm,
  },
  ctaText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
});
