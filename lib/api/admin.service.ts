import { api } from './client';

// ---- Types ----

export interface AdminAnalytics {
  users: { total: number; artists: number; listeners: number };
  tracks: { total: number; totalPlays: number };
  revenue: { total: number; monthly: number };
  growth: { userGrowthRate: number; revenueGrowthRate: number };
}

export interface SystemHealth {
  database: { status: string; responseTime: number; connections: number };
  api: { status: string; requestsPerMinute: number; averageResponseTime: number };
  users: { totalActive: number; concurrentListeners: number };
  storage: { audioFiles: number; totalSize: string; availability: string };
}

export interface ReviewMetrics {
  pending_count: number;
  approvals_30d: number;
  rejections_30d: number;
  avg_approval_latency_seconds: number | null;
  by_day: Array<{ day: string; action: string; count: number }>;
}

export interface ReviewTrack {
  id: number;
  title: string;
  artist_name: string;
  artist_id: number;
  genre: string | null;
  audio_url: string;
  cover_art_url: string | null;
  review_status: string;
  created_at: string;
}

export interface FraudReport {
  totalActivities: number;
  highRiskCount: number;
  flaggedUsers: number;
  riskCategories: {
    suspiciousPlaying: number;
    botBehavior: number;
    multipleIPs: number;
  };
  recentFlags: Array<{
    id: number;
    user_id: number;
    track_id: number;
    played_at: string;
    track: { title: string | null; artist_name: string | null };
    user: { email: string | null; name: string | null };
    fraudRisk: { isHighRisk: boolean; riskScore: number; reasons: string[] };
  }>;
}

export interface ContentModeration {
  pendingReview: Array<{
    id: number;
    title: string;
    artist_name: string;
    flag_reason: string;
    created_at: string;
  }>;
  flaggedContent: Array<{
    id: number;
    title: string;
    artist_name: string;
    flag_reason: string;
    action: string;
    created_at: string;
  }>;
  totalPending: number;
}

export interface FinancialMetrics {
  revenue: { gross: number; net: number; subscriptions: number };
  costs: { artistPayments: number; listenerDividends: number; total: number };
  metrics: { profitMargin: number; costPerUser: number; revenuePerUser: number };
}

export interface ProofMetrics {
  verified_artists: number;
  approved_tracks: number;
  first_listens: number;
  settled_payouts: number;
  total_rewards: number;
  premium_first_listens_30d: number;
  base_rate_plays_30d: number;
  payout_liability_30d: number;
  reward_liability_30d: number;
}

// ---- User Management Types ----

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  type: 'artist' | 'listener' | 'admin';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserList {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---- AI Review Types ----

export interface AiReviewTrack {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  audio_url: string;
  cover_art_url: string | null;
  ai_score: number | null;
  is_ai_generated: boolean;
  detected_ai_platform: string | null;
  ai_detection_confidence: number | null;
  ai_detection_flags: string[] | null;
  ai_review_status: string;
  ai_reviewed_by: number | null;
  ai_reviewed_at: string | null;
  ai_detection_explanation: string | null;
  created_at: string;
  artist_email: string | null;
  artist_verified: boolean;
}

export interface AiReviewStats {
  by_status: Record<string, number>;
  pending_review_count: number;
  flagged_count: number;
  approved_count: number;
  rejected_count: number;
  by_platform: Array<{ platform: string; count: number }>;
  score_statistics: Array<{
    status: string;
    avg_score: number;
    min_score: number;
    max_score: number;
    count: number;
  }>;
  recent_reviews: Array<{
    id: number;
    title: string;
    artist_name: string;
    ai_score: number | null;
    ai_review_status: string;
    ai_reviewed_at: string;
    reviewer_name: string | null;
  }>;
}

// ---- API Functions ----

// Dashboard
export const getAnalytics = async (): Promise<AdminAnalytics> => {
  const response = await api.get('/admin/analytics');
  return response.data;
};

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await api.get('/admin/system-health');
  return response.data;
};

// Users
export const getUsers = async (params?: { search?: string; page?: number; limit?: number }): Promise<AdminUserList> => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const grantAdmin = async (userId: number) => {
  const response = await api.post(`/admin/users/${userId}/grant-admin`);
  return response.data;
};

export const revokeAdmin = async (userId: number) => {
  const response = await api.post(`/admin/users/${userId}/revoke-admin`);
  return response.data;
};

// AI Review / Audio Analysis
export const getAiReviewQueue = async (status = 'pending_review', page = 1): Promise<{ tracks: AiReviewTrack[]; pagination: { page: number; total: number; totalPages: number } }> => {
  const response = await api.get(`/admin/ai-review/queue?status=${status}&page=${page}&limit=20`);
  return response.data;
};

export const getAiReviewStats = async (): Promise<{ stats: AiReviewStats }> => {
  const response = await api.get('/admin/ai-review/stats');
  return response.data;
};

export const approveAiTrack = async (trackId: number, notes?: string) => {
  const response = await api.post(`/admin/ai-review/${trackId}/approve`, { notes });
  return response.data;
};

export const confirmAiTrack = async (trackId: number, notes?: string) => {
  const response = await api.post(`/admin/ai-review/${trackId}/confirm-ai`, { notes });
  return response.data;
};

// Stripe Balance (live from Stripe API)
export interface StripeBalance {
  connected: boolean;
  mode?: string;
  availableBalance?: Array<{ currency: string; amount: number }>;
  pendingBalance?: Array<{ currency: string; amount: number }>;
  error?: string;
}

export const getStripeBalance = async (): Promise<StripeBalance> => {
  const response = await api.get('/admin/health/stripe/test-connection');
  return response.data;
};

// Ledger Reconciliation (settled truth from plays table)
export interface LedgerReconciliation {
  window: string;
  settled_total_cents: number;
  artist_paid_cents: number;
  artist_outstanding_liability_cents: number;
  listener_accrued_cents: number;
  listener_paid_cents: number;
  listener_outstanding_liability_cents: number;
  reserve_balance_cents: number;
  solvent_total: boolean;
}

export const getLedgerReconciliation = async (window: 'lifetime' | '30d' | '7d' = 'lifetime'): Promise<LedgerReconciliation> => {
  const response = await api.get(`/admin/metrics/ledger-reconciliation?window=${window}`);
  return response.data;
};

// Review
export const getReviewMetrics = async (): Promise<ReviewMetrics> => {
  const response = await api.get('/admin/metrics/review');
  return response.data;
};

export const getPendingTracks = async (status = 'pending'): Promise<{ tracks: ReviewTrack[]; count: number }> => {
  const response = await api.get(`/admin/tracks/review?status=${status}`);
  return response.data;
};

export const approveTrack = async (trackId: number) => {
  const response = await api.post(`/admin/tracks/${trackId}/approve`);
  return response.data;
};

export const rejectTrack = async (trackId: number, reason: string) => {
  const response = await api.post(`/admin/tracks/${trackId}/reject`, { reason });
  return response.data;
};

// Trust & Safety
export const getFraudReports = async (): Promise<FraudReport> => {
  const response = await api.get('/admin/fraud-reports');
  return response.data;
};

export const getContentModeration = async (): Promise<ContentModeration> => {
  const response = await api.get('/admin/content-moderation');
  return response.data;
};

export const blockUser = async (userId: number, reason: string) => {
  const response = await api.post(`/admin/users/${userId}/block`, { reason });
  return response.data;
};

// Payments
export const getFinancialMetrics = async (): Promise<FinancialMetrics> => {
  const response = await api.get('/admin/financial-metrics');
  return response.data;
};

export const getProofMetrics = async (): Promise<ProofMetrics> => {
  const response = await api.get('/admin/metrics/proof');
  return response.data;
};
