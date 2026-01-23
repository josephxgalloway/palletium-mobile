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
    description: 'Unlimited streaming with dividend rewards',
    price: 9.99,
    interval: 'month',
    features: [
      'Unlimited ad-free streaming',
      'Earn listening dividends',
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
      'Unlimited ad-free streaming',
      'Earn listening dividends',
      'Offline downloads',
      'High-quality audio',
      '2 months free',
    ],
    stripePriceId: 'price_listener_basic_yearly',
  },
  listener_premium_monthly: {
    id: 'listener_premium_monthly',
    name: 'Premium Monthly',
    description: '1.5× dividend multiplier for power listeners',
    price: 14.99,
    interval: 'month',
    features: [
      'All Basic features',
      '1.5× dividend earnings',
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
      '1.5× dividend earnings',
      'Early access to new releases',
      'Exclusive content',
      'Priority support',
      '2 months free',
    ],
    stripePriceId: 'price_listener_premium_yearly',
  },
  artist_pro_yearly: {
    id: 'artist_pro_yearly',
    name: 'Artist Pro',
    description: '100% revenue share - keep everything you earn',
    price: 19.99,
    interval: 'year',
    features: [
      '100% revenue share (0% platform fee)',
      'Advanced analytics dashboard',
      'Priority support',
      'Promotional tools',
      'Verified artist badge',
    ],
    stripePriceId: 'price_artist_pro_yearly',
  },
};

/**
 * Get current subscription status
 */
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const response = await api.get('/subscriptions/status');
  return response.data;
};

/**
 * Create a Stripe checkout session for subscription
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
  return response.data;
};

/**
 * Get Stripe customer portal URL for managing subscription
 */
export const getCustomerPortal = async (
  returnUrl?: string
): Promise<CustomerPortalResponse> => {
  const response = await api.post('/subscriptions/portal', {
    returnUrl: returnUrl || 'palletium://settings/subscription',
  });
  return response.data;
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
