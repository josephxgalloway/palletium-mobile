/**
 * Entitlements helper — mirrors web's src/lib/entitlements.ts
 *
 * Derives capabilities from user state. No "hybrid" account type —
 * capabilities are composed from independent flags.
 */
import type { User } from '@/types';

export type ListenerTier = 'none' | 'basic' | 'premium';

export interface UserEntitlements {
  isAdmin: boolean;
  isArtist: boolean;
  isVerifiedArtist: boolean;
  hasActiveListenerSubscription: boolean;
  canUploadMusic: boolean;
  listenerTier: ListenerTier;
  roleLabel: 'Admin' | 'Artist + Listener' | 'Artist' | 'Listener';
}

const ACTIVE_STATUSES = ['active', 'trialing'];

export function getUserEntitlements(user: User | null | undefined): UserEntitlements {
  if (!user) {
    return {
      isAdmin: false,
      isArtist: false,
      isVerifiedArtist: false,
      hasActiveListenerSubscription: false,
      canUploadMusic: false,
      listenerTier: 'none',
      roleLabel: 'Listener',
    };
  }

  const isAdmin = user.type === 'admin' || user.is_admin === true;

  // Artist account type (backend: user.type === 'artist')
  const isArtist = user.type === 'artist';

  // Artist verification is identity-verified via Stripe Identity (backend: isVerified)
  const isVerifiedArtist = isArtist && user.isVerified === true;

  // Active listener subscription: check stripe_subscription_status first, fall back to subscription_status
  const hasActiveListenerSubscription =
    ACTIVE_STATUSES.includes(user.stripe_subscription_status ?? '') ||
    ACTIVE_STATUSES.includes(user.subscription_status ?? '');

  // Derive listener tier from subscription_tier string
  let listenerTier: ListenerTier = 'none';
  if (hasActiveListenerSubscription && user.subscription_tier) {
    if (user.subscription_tier.includes('premium')) {
      listenerTier = 'premium';
    } else if (user.subscription_tier.includes('basic')) {
      listenerTier = 'basic';
    }
  }
  // Fallback: tier_id (1 = free, 2-3 = basic, 4-5 = premium)
  if (listenerTier === 'none' && user.tier_id >= 2) {
    listenerTier = user.tier_id >= 4 ? 'premium' : 'basic';
  }

  // Role label — Admin overrides, then composite
  let roleLabel: UserEntitlements['roleLabel'];
  if (isAdmin) {
    roleLabel = 'Admin';
  } else if (isArtist && hasActiveListenerSubscription) {
    roleLabel = 'Artist + Listener';
  } else if (isArtist) {
    roleLabel = 'Artist';
  } else {
    roleLabel = 'Listener';
  }

  return {
    isAdmin,
    isArtist,
    isVerifiedArtist,
    hasActiveListenerSubscription,
    canUploadMusic: true, // Any authenticated user can upload; server enforces cap/review
    listenerTier,
    roleLabel,
  };
}
