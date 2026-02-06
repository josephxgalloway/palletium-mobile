import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/lib/store/authStore';
import { getUserEntitlements } from '@/lib/entitlements';
import api from '@/lib/api/client';
import { theme } from '@/constants/theme';

// Ensure browser is dismissed when returning
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    login,
    verify2FA,
    cancel2FA,
    isLoading,
    error,
    clearError,
    requires2FA
  } = useAuthStore();

  const getPostLoginRoute = () => {
    const user = useAuthStore.getState().user;
    const { isAdmin } = getUserEntitlements(user);
    return isAdmin ? '/(tabs)/admin-dashboard' : '/(tabs)';
  };

  const handleLogin = async () => {
    const result = await login(email, password);
    if (result === true) {
      router.replace(getPostLoginRoute() as any);
    }
    // If result === '2fa', the store will set requires2FA = true
    // and we'll show the 2FA verification screen
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    clearError();

    try {
      // Get the auth URL from backend
      const response = await api.get('/oauth/google/authorize');
      const { authUrl, state } = response.data;

      if (!authUrl) {
        throw new Error('Failed to get authentication URL');
      }

      // Open Google auth in browser
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'palletium://oauth/callback'
      );

      if (result.type === 'success' && result.url) {
        // Parse the callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (code && returnedState === state) {
          // Exchange code for token
          const tokenResponse = await api.post('/oauth/google/callback', {
            code,
            state: returnedState,
            redirectUri: 'palletium://oauth/callback',
          });

          const data = tokenResponse.data;
          const accessToken = data.accessToken || data.token;
          const refreshToken = data.refreshToken || '';
          const user = data.user;

          if (accessToken) {
            await SecureStore.setItemAsync('accessToken', accessToken);
            if (refreshToken) {
              await SecureStore.setItemAsync('refreshToken', refreshToken);
            }

            // Update auth store
            useAuthStore.setState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            router.replace(getPostLoginRoute() as any);
          }
        }
      }
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      useAuthStore.setState({
        error: error.response?.data?.message || 'Google Sign In failed. Please try again.',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    const success = await verify2FA(twoFactorCode);
    if (success) {
      router.replace(getPostLoginRoute() as any);
    }
  };

  const handleCancel2FA = () => {
    cancel2FA();
    setTwoFactorCode('');
  };

  const isValid = email.length > 0 && password.length > 0;
  const is2FAValid = twoFactorCode.length >= 6;

  // 2FA Verification Screen
  if (requires2FA) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.twoFactorIcon}>
              <Ionicons name="shield-checkmark" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Two-Factor Authentication</Text>
            <Text style={styles.tagline}>
              Enter the 6-digit code from your authenticator app or use a backup code
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="keypad" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="Enter code"
                placeholderTextColor={theme.colors.textMuted}
                value={twoFactorCode}
                onChangeText={(text) => {
                  setTwoFactorCode(text.replace(/[^a-zA-Z0-9]/g, ''));
                  clearError();
                }}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={8}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, !is2FAValid && styles.buttonDisabled]}
              onPress={handleVerify2FA}
              disabled={isLoading || !is2FAValid}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleCancel2FA}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Standard Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Palletium</Text>
          <Text style={styles.tagline}>Stream music. Earn rewards.</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignSelf: 'center',
  },
  twoFactorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: theme.fontSize.xl,
    letterSpacing: 4,
    fontWeight: '600',
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.textSecondary,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
