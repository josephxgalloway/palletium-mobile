import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api/client';

const RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Amber banner shown to users who haven't verified their email.
 * Dismissible per session (React state — returns on app restart).
 *
 * Mirrors web: palletium-platform/src/components/EmailVerificationBanner.tsx
 */
export function EmailVerificationBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResendAt, setLastResendAt] = useState<number>(0);

  const handleResend = useCallback(async () => {
    const now = Date.now();
    if (now - lastResendAt < RESEND_COOLDOWN_MS) {
      setMessage('Try again in a few minutes.');
      return;
    }

    setResending(true);
    setMessage(null);
    try {
      await api.post('/auth/resend-verification');
      setMessage('Verification email sent! Check your inbox.');
      setLastResendAt(Date.now());
    } catch (err: any) {
      if (err.response?.status === 429) {
        setMessage('Try again in a few minutes.');
      } else {
        setMessage(err.response?.data?.message || 'Failed to resend. Try again later.');
      }
    } finally {
      setResending(false);
    }
  }, [lastResendAt]);

  const handleVerifyNow = useCallback(() => {
    Linking.openURL('https://palletium.com/verify-email');
  }, []);

  // Hide conditions
  if (!user) return null;
  if (user.email_verified !== false) return null;
  if (dismissed) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ionicons name="mail" size={16} color="#FBBF24" style={styles.icon} />
        <Text style={styles.text} numberOfLines={2}>
          {message || 'Please verify your email to unlock listener rewards.'}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleVerifyNow} style={styles.actionButton}>
            <Text style={styles.actionText}>Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            style={[styles.actionButton, resending && styles.actionDisabled]}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#FCD34D" />
            ) : (
              <Text style={styles.actionText}>Resend</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDismissed(true)}
            style={styles.dismissButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="rgba(251, 191, 36, 0.5)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(120, 53, 15, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: '#FDE68A',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: theme.spacing.sm,
    flexShrink: 0,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: theme.fontSize.xs,
    color: '#FCD34D',
    textDecorationLine: 'underline',
  },
  dismissButton: {
    padding: 2,
  },
});
