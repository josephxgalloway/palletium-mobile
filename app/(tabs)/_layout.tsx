import { LegalGuard } from '@/components/LegalGuard';
import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { isAdmin, isArtist } = getUserEntitlements(user);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Calculate proper bottom padding for iPhone notch/home indicator
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  // Role-aware tab visibility: null hides from tab bar, undefined shows it
  const showForUsers = isAdmin ? null : undefined;
  const showForAdmins = isAdmin ? undefined : null;
  // Studio: artist-only (hidden from listeners and admins)
  const showForArtists = (isArtist && !isAdmin) ? undefined : null;
  // Rewards: listener-only (hidden from artists; visible for listeners including hybrid)
  const showForListeners = (!isArtist && !isAdmin) ? undefined : null;

  return (
    <LegalGuard>
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: tabBarHeight,
          // Ensure content doesn't get cut off
          ...(Platform.OS === 'ios' && {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }),
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        // Hide header for tab screens (they have their own)
        headerShown: false,
      }}
    >
      {/* ===== NON-ADMIN TABS (hidden for admins) ===== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          href: showForUsers,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      {/* Search tab hidden - merged into Library */}
      <Tabs.Screen
        name="search"
        options={{
          href: null, // Always hidden
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          href: showForUsers,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          href: showForListeners,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: 'Studio',
          href: showForArtists,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      {/* Community tab hidden - replaced with Journey */}
      <Tabs.Screen
        name="community"
        options={{
          href: null, // Always hidden
        }}
      />
      {/* Journey tab hidden - feature not yet available */}
      <Tabs.Screen
        name="journey"
        options={{
          href: null, // Always hidden
        }}
      />

      {/* ===== ADMIN TABS (hidden for non-admins) ===== */}
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: 'Dashboard',
          href: showForAdmins,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-review"
        options={{
          title: 'Review',
          href: showForAdmins,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-trust"
        options={{
          title: 'Trust',
          href: showForAdmins,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-payments"
        options={{
          title: 'Payments',
          href: showForAdmins,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />

      {/* ===== SHARED TAB ===== */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </LegalGuard>
  );
}
