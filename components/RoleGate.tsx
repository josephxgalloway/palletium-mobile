/**
 * RoleGate — canonical route-level guard for role-based access control.
 *
 * Wraps a screen component. If the authenticated user's role is not in the
 * `allow` list, immediately replaces the route with `fallbackHref` (default:
 * tabs root). No data hooks should fire before this gate resolves.
 *
 * Usage:
 *   <RoleGate allow={['artist']}>
 *     <ArtistEarningsContent />
 *   </RoleGate>
 */

import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

export type AllowedRole = 'artist' | 'listener' | 'admin';

interface RoleGateProps {
  /** Roles permitted to see this screen */
  allow: AllowedRole[];
  /** Where to redirect unauthorized users (default: tabs root) */
  fallbackHref?: string;
  children: React.ReactNode;
}

export function RoleGate({ allow, fallbackHref = '/(tabs)', children }: RoleGateProps) {
  const { user, isLoading } = useAuthStore();
  const { isAdmin, isArtist } = getUserEntitlements(user);
  const hasRedirected = useRef(false);

  // Derive the user's effective role
  const userRole: AllowedRole | null = isAdmin
    ? 'admin'
    : isArtist
      ? 'artist'
      : user
        ? 'listener'
        : null;

  const isAllowed = userRole !== null && allow.includes(userRole);

  // Redirect unauthorized users — fire once, before any child hooks
  useEffect(() => {
    if (isLoading || hasRedirected.current) return;
    if (!isAllowed) {
      hasRedirected.current = true;
      router.replace(fallbackHref as any);
    }
  }, [isLoading, isAllowed, fallbackHref]);

  // While auth is loading, show spinner (no children rendered = no hooks fire)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Unauthorized — render nothing while redirect fires
  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
