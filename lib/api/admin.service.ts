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
