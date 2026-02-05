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
          <Text style={styles.headerTitle}>Artist Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.verifiedContainer}>
            <View style={styles.verifiedIconContainer}>
              <Ionicons name="shield-checkmark" size={64} color={theme.colors.success} />
            </View>
            <Text style={styles.verifiedTitle}>You're Verified</Text>
            <Text style={styles.verifiedSubtitle}>
              Your identity has been confirmed via Stripe Identity.
            </Text>

            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>Your Benefits</Text>
              <BenefitRow icon="cash" text="$1.00 per first listen" />
              <BenefitRow icon="repeat" text="$0.01 per repeat listen" />
              <BenefitRow icon="cloud-upload" text="Unlimited track uploads" />
              <BenefitRow icon="eye" text="Immediate discovery visibility" />
              <BenefitRow icon="shield-checkmark" text="Verified artist badge" />
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
          <Text style={styles.headerTitle}>Artist Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient
            colors={['rgba(251, 191, 36, 0.15)', 'transparent']}
            style={styles.heroSection}
          >
            <View style={[styles.heroIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="musical-notes" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.heroTitle}>Upload First</Text>
            <Text style={styles.heroSubtitle}>
              Upload your first track to create your artist profile, then come back here to verify and unlock the full $1.00/play rate.
            </Text>
          </LinearGradient>

          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>After Verification</Text>
            <BenefitRow icon="cash" text="$1.00 per first listen (vs $0.004 unverified)" />
            <BenefitRow icon="cloud-upload" text="Unlimited track uploads (vs 3 max)" />
            <BenefitRow icon="eye" text="Immediate discovery visibility" />
            <BenefitRow icon="shield-checkmark" text="Verified artist badge" />
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/upload' as any)}
            activeOpacity={0.9}
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

  // Artist, not verified
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artist Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.15)', 'transparent']}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>Get Verified</Text>
          <Text style={styles.heroSubtitle}>
            Verify your identity to unlock the full $1.00/play rate, unlimited uploads, and instant discovery.
          </Text>
        </LinearGradient>

        {/* What you get */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Verified Artist Benefits</Text>
          <BenefitRow icon="cash" text="$1.00 per first listen (vs $0.004 unverified)" />
          <BenefitRow icon="cloud-upload" text="Unlimited track uploads (vs 3 max)" />
          <BenefitRow icon="eye" text="Immediate discovery visibility" />
          <BenefitRow icon="shield-checkmark" text="Verified artist badge" />
          <BenefitRow icon="analytics" text="Advanced analytics dashboard" />
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.benefitsTitle}>How It Works</Text>
          <StepRow number="1" text="Upload a government-issued ID (passport, driver's license, or ID card)" />
          <StepRow number="2" text="Take a quick selfie for identity matching" />
          <StepRow number="3" text="Stripe verifies your identity securely" />
          <StepRow number="4" text="Once approved, your account unlocks full features" />
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>$49.99/year</Text>
          <Text style={styles.pricingSubtitle}>Just $4.17/month</Text>
          <Text style={styles.pricingNote}>
            Includes Stripe Identity verification + all verified artist benefits
          </Text>
        </View>

        {/* Separation note */}
        <View style={styles.separationNote}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.separationNoteText}>
            Artist Verification unlocks payout rates and uploads. Listener subscription unlocks rewards. They are separate entitlements.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartVerification}
          disabled={loading}
          activeOpacity={0.9}
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
      <Ionicons name={icon} size={18} color={theme.colors.success} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    padding: theme.spacing.md,
  },
  // Verified state
  verifiedContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },
  verifiedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  verifiedTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  verifiedSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 22,
  },
  // Benefits
  benefitsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  benefitsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  benefitText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  // How it works
  howItWorks: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  stepText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  // Pricing
  pricingCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pricingTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: '#10B981',
  },
  pricingSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  pricingNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  // Separation note
  separationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  separationNoteText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  // CTA
  ctaButton: {
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
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
