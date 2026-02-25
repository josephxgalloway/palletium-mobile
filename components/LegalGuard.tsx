import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { LEGAL_DOC_VERSION } from '@/lib/legal';
import api from '@/lib/api/client';

type GuardState = 'checking' | 'accepted' | 'needs_acceptance' | 'error';

/**
 * Mobile LegalGuard — fail-closed legal acceptance gate.
 *
 * Mirrors web: palletium-platform/src/app/legal/accept/page.tsx
 *
 * On mount, checks GET /api/legal/status. If needsReAcceptance is true,
 * presents a full-screen acceptance UI that blocks all other interaction.
 * After acceptance, refreshes the auth token so JWT gets legalAccepted: true.
 */
export function LegalGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [state, setState] = useState<GuardState>('checking');
  const [requiredVersion, setRequiredVersion] = useState<string>(LEGAL_DOC_VERSION);
  const [acceptance, setAcceptance] = useState({ terms: false, privacy: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLegalStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setState('accepted'); // Not logged in — nothing to guard
      return;
    }

    setState('checking');
    try {
      const response = await api.get('/legal/status');
      const { currentVersion, needsReAcceptance } = response.data.status;
      if (currentVersion) setRequiredVersion(currentVersion);

      setState(needsReAcceptance ? 'needs_acceptance' : 'accepted');
    } catch (err: any) {
      // Fail closed: if we can't determine status, require acceptance
      console.error('[LegalGuard] Status check failed:', err.message);
      setState('needs_acceptance');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkLegalStatus();
  }, [checkLegalStatus]);

  const handleAccept = async () => {
    if (!acceptance.terms || !acceptance.privacy) {
      setError('You must accept both the Terms of Service and Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/legal/accept', {
        termsAccepted: acceptance.terms,
        privacyAccepted: acceptance.privacy,
        version: requiredVersion,
      });

      // Refresh auth token so JWT includes legalAccepted: true
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );
          const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
          if (accessToken) await SecureStore.setItemAsync('accessToken', accessToken);
          if (newRefreshToken) await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        }
      } catch (refreshErr) {
        // Token refresh failed — checkAuth will pick up the updated user on next call
        console.warn('[LegalGuard] Token refresh after acceptance failed:', refreshErr);
      }

      // Refresh user state
      await checkAuth();
      setState('accepted');
    } catch (err: any) {
      console.error('[LegalGuard] Acceptance failed:', err.message);
      setError(
        err.response?.data?.error || 'Failed to record acceptance. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not authenticated — let auth flow handle it
  if (!isAuthenticated) return <>{children}</>;

  // Still checking
  if (state === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.checkingText}>Checking legal status...</Text>
      </View>
    );
  }

  // Accepted — render children
  if (state === 'accepted') return <>{children}</>;

  // Needs acceptance or error — show acceptance screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={32} color="#FBBF24" />
          </View>
          <Text style={styles.title}>Updated Legal Documents</Text>
          <Text style={styles.subtitle}>
            We've updated our Terms of Service and Privacy Policy. Please review and accept to continue using Palletium.
          </Text>
        </View>

        {/* Version Info */}
        <View style={styles.versionBox}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Document Version</Text>
            <Text style={styles.versionValue}>{requiredVersion}</Text>
          </View>
        </View>

        {/* Document Links */}
        <View style={styles.linksSection}>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => Linking.openURL('https://palletium.com/terms')}
          >
            <Ionicons name="document-text" size={20} color={theme.colors.secondary} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Terms of Service</Text>
              <Text style={styles.linkDescription}>Read the full terms</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => Linking.openURL('https://palletium.com/privacy')}
          >
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.secondary} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Privacy Policy</Text>
              <Text style={styles.linkDescription}>Read the full policy</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => Linking.openURL('https://palletium.com/terms#payment-reserve-amendment')}
          >
            <Ionicons name="scale" size={20} color={theme.colors.secondary} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Payment Reserve Amendment</Text>
              <Text style={styles.linkDescription}>New in v2.5.0</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Checkboxes */}
        <View style={styles.checkboxSection}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAcceptance((prev) => ({ ...prev, terms: !prev.terms }))}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptance.terms && styles.checkboxChecked]}>
              {acceptance.terms && (
                <Ionicons name="checkmark" size={14} color={theme.colors.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Terms of Service
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAcceptance((prev) => ({ ...prev, privacy: !prev.privacy }))}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptance.privacy && styles.checkboxChecked]}>
              {acceptance.privacy && (
                <Ionicons name="checkmark" size={14} color={theme.colors.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!acceptance.terms || !acceptance.privacy || isSubmitting) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!acceptance.terms || !acceptance.privacy || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <View style={styles.acceptButtonContent}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
              <Text style={styles.acceptButtonText}>Accept and Continue</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Questions? Contact legal@palletium.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  checkingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(120, 53, 15, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  versionBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  versionValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  linksSection: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  linkDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  checkboxSection: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  acceptButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  footer: {
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
