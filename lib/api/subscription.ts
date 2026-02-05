import api from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

export interface CreateCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionStatus {
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
  plan?: SubscriptionPlan;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface CustomerPortalResponse {
  url: string;
}

// Subscription plans matching web platform
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  listener_basic_monthly: {
    id: 'listener_basic_monthly',
    name: 'Basic Monthly',
    description: 'Earn rewards for discovering music',
    price: 9.99,
    interval: 'month',
    features: [
      'Uninterrupted listening',
      'Earn listener rewards',
      'Offline downloads',
      'High-quality audio',
    ],
    stripePriceId: 'price_listener_basic_monthly',
  },
  listener_basic_yearly: {
    id: 'listener_basic_yearly',
    name: 'Basic Yearly',
    description: 'Save 17% with annual billing',
    price: 99,
    interval: 'year',
    features: [
      'Uninterrupted listening',
      'Earn listener rewards',
      'Offline downloads',
      'High-quality audio',
      '2 months free',
    ],
    stripePriceId: 'price_listener_basic_yearly',
  },
  listener_premium_monthly: {
    id: 'listener_premium_monthly',
    name: 'Premium Monthly',
    description: '1.5× rewards multiplier for power listeners',
    price: 14.99,
    interval: 'month',
    features: [
      'All Basic features',
      '1.5× rewards earnings',
      'Early access to new releases',
      'Exclusive content',
      'Priority support',
    ],
    stripePriceId: 'price_listener_premium_monthly',
  },
  listener_premium_yearly: {
    id: 'listener_premium_yearly',
    name: 'Premium Yearly',
    description: 'Save 17% with annual billing',
    price: 149,
    interval: 'year',
    features: [
      'All Basic features',
      '1.5× rewards earnings',
      'Early access to new releases',
      'Exclusive content',
      'Priority support',
      '2 months free',
    ],
    stripePriceId: 'price_listener_premium_yearly',
  },
  artist_pro_yearly: {
    id: 'artist_pro_yearly',
    name: 'Artist Verification',
    description: 'Unlock $1.00/play rate and unlimited uploads',
    price: 49.99,
    interval: 'year',
    features: [
      '$1.00 per first listen (vs $0.004 unverified)',
      'Unlimited track uploads',
      'Immediate discovery visibility',
      'Verified artist status',
      'Advanced analytics dashboard',
    ],
    stripePriceId: 'price_artist_pro_yearly',
  },
};

/**
 * Get current subscription status
 *
 * Backend endpoint: GET /api/subscriptions/status
 * Response: { ok, subscribed, status, tier, interval, currentPeriodEnd, cancelAtPeriodEnd }
 */
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const response = await api.get('/subscriptions/status');
  const data = response.data;

  // Map backend response to mobile format
  if (!data.ok && data.error) {
    throw new Error(data.error);
  }

  // Map 'none' status from backend when not subscribed
  const status = data.subscribed
    ? (data.status as SubscriptionStatus['status'])
    : 'none';

  // Build plan object if subscribed
  let plan: SubscriptionPlan | undefined;
  if (data.subscribed && data.tier) {
    const planKey = `listener_${data.tier}_${data.interval === 'year' ? 'yearly' : 'monthly'}`;
    plan = SUBSCRIPTION_PLANS[planKey] || {
      id: planKey,
      name: data.tier.charAt(0).toUpperCase() + data.tier.slice(1),
      description: '',
      price: 0,
      interval: data.interval || 'month',
      features: [],
      stripePriceId: '',
    };
  }

  return {
    status,
    plan,
    currentPeriodEnd: data.currentPeriodEnd || undefined,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
  };
};

/**
 * Create a Stripe checkout session for subscription
 *
 * Backend endpoint: POST /api/subscriptions/checkout
 * Request: { planId, successUrl?, cancelUrl? }
 * Response: { ok, sessionId, url }
 */
export const createCheckoutSession = async (
  planId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CreateCheckoutResponse> => {
  const response = await api.post('/subscriptions/checkout', {
    planId,
    successUrl: successUrl || 'palletium://subscription/success',
    cancelUrl: cancelUrl || 'palletium://subscription/cancel',
  });

  const data = response.data;
  if (!data.ok) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  return {
    sessionId: data.sessionId,
    url: data.url,
  };
};

/**
 * Get Stripe customer portal URL for managing subscription
 *
 * Backend endpoint: POST /api/subscriptions/portal
 * Request: { returnUrl? }
 * Response: { ok, url }
 */
export const getCustomerPortal = async (
  returnUrl?: string
): Promise<CustomerPortalResponse> => {
  const response = await api.post('/subscriptions/portal', {
    returnUrl: returnUrl || 'palletium://settings/subscription',
  });

  const data = response.data;
  if (!data.ok) {
    throw new Error(data.error || 'Failed to get customer portal');
  }

  return {
    url: data.url,
  };
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async (): Promise<{ success: boolean }> => {
  const response = await api.post('/subscriptions/cancel');
  return response.data;
};

/**
 * Resume a canceled subscription
 */
export const resumeSubscription = async (): Promise<{ success: boolean }> => {
  const response = await api.post('/subscriptions/resume');
  return response.data;
};

/**
 * Start free trial
 */
export const startFreeTrial = async (): Promise<{ success: boolean; trialEndDate: string }> => {
  const response = await api.post('/subscriptions/trial');
  return response.data;
};

export default {
  SUBSCRIPTION_PLANS,
  getSubscriptionStatus,
  createCheckoutSession,
  getCustomerPortal,
  cancelSubscription,
  resumeSubscription,
  startFreeTrial,
};
