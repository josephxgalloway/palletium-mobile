import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/lib/store/playerStore';
import { theme } from '@/constants/theme';

export default function SignupPromptModal() {
  const { showSignupPrompt, dismissSignupPrompt } = usePlayerStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (showSignupPrompt) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [showSignupPrompt]);

  const handleSignup = () => {
    dismissSignupPrompt();
    router.push('/(auth)/register');
  };

  const handleLogin = () => {
    dismissSignupPrompt();
    router.push('/(auth)/login');
  };

  const handleDismiss = () => {
    dismissSignupPrompt();
  };

  if (!showSignupPrompt) return null;

  return (
    <Modal
      visible={showSignupPrompt}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={handleDismiss} activeOpacity={1} />

        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.surfaceElevated, theme.colors.surface]}
            style={styles.gradient}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="musical-notes" size={48} color={theme.colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Unlock Unlimited Music</Text>

            {/* Description */}
            <Text style={styles.description}>
              You've used all your free previews. Sign up to enjoy full tracks and support artists!
            </Text>

            {/* Benefits */}
            <View style={styles.benefits}>
              <BenefitRow icon="play-circle" text="Listen to full tracks" />
              <BenefitRow icon="cash" text="Artists earn $1.00 per first listen" />
              <BenefitRow icon="gift" text="Earn rewards as you listen" />
              <BenefitRow icon="trophy" text="Track your progress and tiers" />
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
              <Text style={styles.signupButtonText}>Create Free Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function BenefitRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  benefits: {
    marginBottom: theme.spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  benefitText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  signupButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  signupButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
  loginButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
  },
});
