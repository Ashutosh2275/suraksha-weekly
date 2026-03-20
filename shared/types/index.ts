/**
 * Shared TypeScript types for Suraksha Weekly.
 * These types match the backend data models exactly.
 */

/**
 * Gig delivery partner profile.
 */
export interface Worker {
  id: string;
  phone: string;
  name: string;
  city: string;
  service_zones: string[];
  platform_type: 'Zomato' | 'Swiggy';
  avg_daily_hours: number;
  avg_weekly_earnings: number;
  device_fingerprint?: string;
  trust_score: number;
  trust_tier: 'standard' | 'premium' | 'suspended';
  created_at: string;
  updated_at: string;
}

/**
 * Weekly insurance policy.
 */
export interface Policy {
  id: string;
  worker_id: string;
  plan_variant: string;
  status: 'active' | 'expired' | 'cancelled';
  weekly_premium: number;
  coverage_cap: number;
  start_date: string;
  end_date: string;
  renewal_count: number;
  waiting_period_until?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Computed risk assessment for a worker.
 */
export interface RiskProfile {
  id: string;
  worker_id: string;
  location_risk_index: number;
  disruption_frequency_score: number;
  hour_exposure_score: number;
  platform_segment_factor: number;
  computed_at: string;
  updated_at: string;
}

/**
 * Parametric disruption trigger event.
 */
export interface TriggerEvent {
  id: string;
  type: 'HeavyRain' | 'ExtremeHeat' | 'SeverePollution' | 'LocalRestriction' | 'PlatformOutage';
  zone: string;
  value: number;
  threshold: number;
  confidence_score: number;
  sources: string[];
  status: 'confirmed' | 'pending' | 'rejected';
  triggered_at: string;
  audit_snapshot: Record<string, unknown>;
  created_at: string;
}

/**
 * Insurance claim.
 */
export interface Claim {
  id: string;
  worker_id: string;
  policy_id: string;
  trigger_event_id: string;
  status: 'initiated' | 'in_review' | 'approved' | 'rejected' | 'blocked' | 'paid';
  fraud_score: number;
  fraud_reason_tags: string[];
  payout_amount: number;
  idempotency_key: string;
  initiated_at: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fraud assessment result.
 */
export interface FraudAssessment {
  id: string;
  claim_id: string;
  score: number;
  decision: 'auto_approve' | 'hold' | 'manual_review' | 'auto_block';
  reason_codes: string[];
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payout transaction record.
 */
export interface PayoutTransaction {
  id: string;
  claim_id: string;
  worker_id: string;
  amount: number;
  gateway: 'razorpay' | 'stripe';
  gateway_ref?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  idempotency_key: string;
  initiated_at: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Immutable audit log entry.
 */
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  actor_id?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * API response wrapper.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  reason_codes?: string[];
  status: number;
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  total: number;
}

/**
 * Paginated API response.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  status: number;
}
