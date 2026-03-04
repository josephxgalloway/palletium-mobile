import { AnimatedSplash } from '@/components/AnimatedSplash';
import MiniPlayer from '@/components/player/MiniPlayer';
import SignupPromptModal from '@/components/SignupPromptModal';
import { ArtistPlayToast } from '@/components/artist/ArtistPlayToast';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { toastConfig } from '@/components/ui/Toast';
import { theme } from '@/constants/theme';
import { setupPlayer } from '@/lib/audio/trackPlayer';
import { useAuthStore } from '@/lib/store/authStore';
import { useGamificationStore } from '@/lib/store/gamificationStore';
import { useNetworkStore } from '@/lib/store/networkStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus, PanResponder } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router as expoRouter } from 'expo-router';
import {
  resetInactivityTimer,
  isInactive,
  initInactivityTimer,
  flushToSecureStore,
  setAutoLoggedOut,
} from '@/lib/inactivity';
import Toast from 'react-native-toast-message';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Lazy load Stripe - not available in Expo Go
let StripeProvider: any = null;
let isStripeAvailable = false;
try {
  StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
  isStripeAvailable = true;
} catch (e) {
  console.warn('Stripe not available - running in Expo Go');
}

// Wrapper that conditionally uses Stripe
function OptionalStripeProvider({ children }: { children: ReactNode }) {
  if (isStripeAvailable && StripeProvider) {
    return (
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.palletium"
        urlScheme="palletium"
      >
        {children}
      </StripeProvider>
    );
  }
  return <>{children}</>;
}

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom dark theme matching Palladium aesthetic
const PalletiumTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

export default function RootLayout() {
  const { checkAuth, logout, isLoading, isAuthenticated } = useAuthStore();
  const { initialize: initNetwork } = useNetworkStore();
  const { loadPreviewCount } = usePlayerStore();
  const { fetchStats } = useGamificationStore();
  const [playerReady, setPlayerReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOutRef = useRef(false);

  // PanResponder captures all touch starts for inactivity tracking.
  // Returns false so child gesture handlers work normally.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false;
      },
    })
  ).current;

  const handleInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setAutoLoggedOut();
    await logout();
    expoRouter.replace('/(auth)/login' as any);
  }, [logout]);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function init() {
      // Initialize auth
      await checkAuth();

      // Cold-start inactivity check: if app was killed and reopened after 15+ min, log out
      const isAuth = useAuthStore.getState().isAuthenticated;
      if (isAuth) {
        const stale = await initInactivityTimer();
        if (stale) {
          setAutoLoggedOut();
          await logout();
          return; // Skip rest of init — user will land on login
        }
        // Fresh login/hydration — reset timer to prevent stale SecureStore causing immediate expiry
        resetInactivityTimer();
      }

      // Load preview count for free users
      await loadPreviewCount();

      // Initialize gamification stats only for authenticated users.
      // Prevents 401 -> refresh flow noise on cold start before login.
      if (isAuth) {
        await fetchStats();
      }

      // Initialize player
      const ready = await setupPlayer();
      setPlayerReady(ready);
    }
    init();

    // Initialize network monitoring
    const unsubscribe = initNetwork();
    return () => unsubscribe();
  }, []);

  // AppState: inactivity check on foreground, flush timestamp on background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBg = appStateRef.current.match(/inactive|background/);

      if (wasBg && nextState === 'active') {
        // Returning to foreground — check inactivity before refreshing auth
        if (isAuthenticated) {
          if (isInactive()) {
            handleInactivityLogout();
          } else {
            checkAuth();
          }
        }
      } else if (!wasBg && nextState.match(/inactive|background/)) {
        // Going to background — flush inactivity timestamp to SecureStore
        if (isAuthenticated) {
          flushToSecureStore(); // Best-effort, awaited internally
        }
      }

      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, checkAuth, handleInactivityLogout]);

  // Foreground inactivity check interval (catches "screen on, no touch" scenarios)
  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
      isLoggingOutRef.current = false;
      return;
    }
    resetInactivityTimer(); // Reset on auth change (fresh login)
    inactivityIntervalRef.current = setInterval(() => {
      if (isInactive() && useAuthStore.getState().isAuthenticated) {
        handleInactivityLogout();
      }
    }, 60_000);
    return () => {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, handleInactivityLogout]);

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if (!loaded || isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      {...panResponder.panHandlers}
    >
      {showAnimatedSplash && (
        <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
      )}
      <OptionalStripeProvider>
        <ThemeProvider value={PalletiumTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.textPrimary,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
              name="player"
              options={{
                presentation: 'modal',
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: 'vertical',
              }}
            />
            <Stack.Screen
              name="upload"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          {/* Email verification banner for unverified users */}
          {isAuthenticated && <EmailVerificationBanner screenName="root_layout" />}
          {/* Mini player shows above tab bar */}
          <MiniPlayer />
          {/* Signup prompt for free users */}
          <SignupPromptModal />
          {/* Artist real-time play notifications */}
          <ArtistPlayToast />
          {/* Toast notifications */}
          <Toast config={toastConfig} />
        </ThemeProvider>
      </OptionalStripeProvider>
    </GestureHandlerRootView>
  );
}
