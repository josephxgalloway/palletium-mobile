import MiniPlayer from '@/components/player/MiniPlayer';
import SignupPromptModal from '@/components/SignupPromptModal';
import { ArtistPlayToast } from '@/components/artist/ArtistPlayToast';
import { toastConfig } from '@/components/ui/Toast';
import { theme } from '@/constants/theme';
import { setupPlayer } from '@/lib/audio/trackPlayer';
import { useAuthStore } from '@/lib/store/authStore';
import { useGamificationStore } from '@/lib/store/gamificationStore';
import { useNetworkStore } from '@/lib/store/networkStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { StripeProvider } from '@stripe/stripe-react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

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
  const { checkAuth, isLoading } = useAuthStore();
  const { initialize: initNetwork } = useNetworkStore();
  const { loadPreviewCount } = usePlayerStore();
  const { fetchStats } = useGamificationStore();
  const [playerReady, setPlayerReady] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function init() {
      // Initialize auth
      await checkAuth();

      // Load preview count for free users
      await loadPreviewCount();

      // Initialize gamification stats (for XP tracking)
      await fetchStats();

      // Initialize player
      const ready = await setupPlayer();
      setPlayerReady(ready);
    }
    init();

    // Initialize network monitoring
    const unsubscribe = initNetwork();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if (!loaded || isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.palletium"
        urlScheme="palletium"
      >
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
            <Stack.Screen name="+not-found" />
          </Stack>
          {/* Mini player shows above tab bar */}
          <MiniPlayer />
          {/* Signup prompt for free users */}
          <SignupPromptModal />
          {/* Artist real-time play notifications */}
          <ArtistPlayToast />
          {/* Toast notifications */}
          <Toast config={toastConfig} />
        </ThemeProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
