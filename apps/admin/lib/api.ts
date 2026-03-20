/**
 * Admin API client for Suraksha Weekly.
 * All requests include the X-Admin-Token header for authorization.
 */
import axios, { type AxiosError } from 'axios';

const BASE_URL =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : null) ??
  'http://localhost:8000/api/v1';

const ADMIN_TOKEN =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ADMIN_TOKEN : null) ??
  'dev-admin-token-change-in-production';

const adminHeaders: Record<string, string> = {
  'X-Admin-Token': ADMIN_TOKEN,
  'Content-Type': 'application/json',
};

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface AdminClaimsParams {
  status?: string;
  zone?: string;
  trigger_type?: string;
  min_fraud?: number;
  page?: number;
  limit?: number;
}

export interface AdminClaim {
  id: string;
  worker_id: string;
  policy_id: string;
  trigger_event_id: string;
  status: string;
  fraud_score: number;
  fraud_reason_tags: string[];
  payout_amount: number;
  initiated_at: string;
  resolved_at: string | null;
  /** Enriched by admin endpoint from related TriggerEvent */
  trigger_type?: string;
  /** Enriched by admin endpoint from related TriggerEvent */
  zone?: string;
}

export interface AdminClaimsResponse {
  total: number;
  page: number;
  limit: number;
  claims: AdminClaim[];
}

export interface ReviewClaimResponse {
  claim_id: string;
  new_status: string;
  decision: string;
  notes: string;
}

export interface FraudCluster {
  id: string;
  cluster_type: string;
  link_node: string;
  member_count: number;
  member_worker_ids: string[];
  risk_level: string;
  flagged_for_kyc: boolean;
  auto_resolved: boolean;
  detected_at: string;
}

export interface FraudClustersResponse {
  total: number;
  clusters: FraudCluster[];
}

export interface ModelStatus {
  rule_only_mode: boolean;
  last_precision: number;
  precision_floor: number;
  model_path: string;
  model_loaded: boolean;
}

export interface TriggerData {
  id: string;
  type: string;
  zone: string;
  value: number;
  threshold: number;
  confidence_score: number;
  sources: string[];
  status: string;
  triggered_at: string;
  audit_snapshot: Record<string, unknown>;
}

export interface ActiveTriggersResponse {
  count: number;
  triggers: TriggerData[];
}

export interface RetryPayoutResponse {
  payout_id: string;
  status: string;
  message: string;
}

export interface AdminAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  actor_id?: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface AdminAuditLogsResponse {
  total: number;
  page: number;
  limit: number;
  logs: AdminAuditLog[];
}

export interface GraphAnalysisResponse {
  status: string;
  message: string;
}

export interface AdminStats {
  active_policies: number;
  claims_today: number;
  fraud_flags: number;
  loss_ratio: number;
  payout_volume_today: number;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Fetches paginated and filtered admin claims list.
 */
export async function getAdminClaims(
  params: AdminClaimsParams = {}
): Promise<AdminClaimsResponse> {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.zone) query.append('zone', params.zone);
  if (params.trigger_type) query.append('trigger_type', params.trigger_type);
  if (params.min_fraud !== undefined) query.append('min_fraud', String(params.min_fraud));
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));

  const url = `${BASE_URL}/admin/claims${query.toString() ? `?${query}` : ''}`;
  const response = await axios.get<AdminClaimsResponse>(url, { headers: adminHeaders });
  return response.data;
}

/**
 * Approves or rejects a claim in the manual review queue.
 */
export async function reviewClaim(
  claimId: string,
  decision: 'approve' | 'reject',
  notes: string
): Promise<ReviewClaimResponse> {
  const url = `${BASE_URL}/admin/claims/${claimId}/review`;
  const response = await axios.patch<ReviewClaimResponse>(
    url,
    { decision, notes },
    { headers: adminHeaders }
  );
  return response.data;
}

/**
 * Returns detected fraud ring clusters.
 */
export async function getFraudClusters(): Promise<FraudClustersResponse> {
  const url = `${BASE_URL}/admin/fraud/clusters`;
  const response = await axios.get<FraudClustersResponse>(url, { headers: adminHeaders });
  return response.data;
}

/**
 * Returns the current fraud ML model health status.
 */
export async function getFraudModelStatus(): Promise<ModelStatus> {
  const url = `${BASE_URL}/admin/fraud/model-status`;
  const response = await axios.get<ModelStatus>(url, { headers: adminHeaders });
  return response.data;
}

/**
 * Triggers a graph-based fraud analysis run on the backend.
 */
export async function runGraphAnalysis(): Promise<GraphAnalysisResponse> {
  const url = `${BASE_URL}/admin/fraud/analyze-graph`;
  const response = await axios.post<GraphAnalysisResponse>(url, {}, { headers: adminHeaders });
  return response.data;
}

/**
 * Fetches all currently active disruption triggers.
 */
export async function getActiveTriggers(): Promise<ActiveTriggersResponse> {
  const url = `${BASE_URL}/triggers/active`;
  const response = await axios.get<ActiveTriggersResponse>(url, { headers: adminHeaders });
  return response.data;
}

/**
 * Retries a failed payout transaction.
 */
export async function retryPayout(payoutId: string): Promise<RetryPayoutResponse> {
  const url = `${BASE_URL}/admin/payouts/${payoutId}/retry`;
  const response = await axios.post<RetryPayoutResponse>(url, {}, { headers: adminHeaders });
  return response.data;
}

/**
 * Returns paginated audit logs for admin operations.
 */
export async function getAdminAuditLogs(params: {
  page?: number;
  limit?: number;
  entity_type?: string;
  action?: string;
  search?: string;
} = {}): Promise<AdminAuditLogsResponse> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.entity_type) query.append('entity_type', params.entity_type);
  if (params.action) query.append('action', params.action);
  if (params.search) query.append('search', params.search);

  const url = `${BASE_URL}/admin/audit-logs${query.toString() ? `?${query}` : ''}`;
  const response = await axios.get<AdminAuditLogsResponse>(url, { headers: adminHeaders });
  return response.data;
}

/**
 * Computes aggregate admin stats from a claims array.
 * Loss ratio uses mock premium estimate: 1247 policies × ₹149 weekly premium.
 */
export function computeAdminStats(claims: AdminClaim[]): AdminStats {
  const todayPrefix = new Date().toISOString().split('T')[0];
  const claimsToday = claims.filter((c) => c.initiated_at.startsWith(todayPrefix));
  const fraudFlags = claims.filter((c) => c.fraud_score > 65);
  const paidToday = claimsToday.filter((c) => c.status === 'paid');
  const payoutVolumeToday = paidToday.reduce((sum, c) => sum + c.payout_amount, 0);

  const totalPayouts = claims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.payout_amount, 0);

  // Estimated weekly premiums: 1247 active policies × ₹149 avg premium
  const estimatedPremiums = 1247 * 149;
  const lossRatio =
    estimatedPremiums > 0 ? Math.min((totalPayouts / estimatedPremiums) * 100, 150) : 73.4;

  return {
    active_policies: 1247,
    claims_today: claimsToday.length,
    fraud_flags: fraudFlags.length,
    loss_ratio: Number(lossRatio.toFixed(1)),
    payout_volume_today: payoutVolumeToday,
  };
}

/** Type-safe helper to extract an error message from an unknown error. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ detail?: string }>;
    return axiosErr.response?.data?.detail ?? axiosErr.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

// ─── Demo Simulation ──────────────────────────────────────────────────────────

export type TriggerType =
  | 'HeavyRain'
  | 'ExtremeHeat'
  | 'SeverePollution'
  | 'LocalRestriction'
  | 'PlatformOutage';

export type IntensityLevel = 'moderate' | 'severe' | 'extreme';

export interface DemoDisruptionRequest {
  trigger_type:    TriggerType;
  zone:            string;
  intensity_level: IntensityLevel;
  city:            string;
}

export interface ClaimBreakdown {
  auto_approved: number;
  in_review:     number;
  blocked:       number;
  initiated:     number;
  total:         number;
}

export interface DemoDisruptionResponse {
  trigger_id:             string;
  trigger_type:           string;
  zone:                   string;
  city:                   string;
  intensity_level:        string;
  intensity_description:  string;
  measured_value:         number;
  threshold_value:        number;
  confidence_score:       number;
  claims_initiated:       number;
  claims_auto_approved:   number;
  claims_flagged:         number;
  total_payout_initiated: number;
  breakdown:              ClaimBreakdown;
  orchestration_ms:       number;
  triggered_at:           string;
}

export interface DemoZonesResponse {
  cities:      Record<string, string[]>;
  total_zones: number;
}

/** Fire a parametric trigger and run the full claim orchestration pipeline. */
export async function simulateDisruption(
  body: DemoDisruptionRequest
): Promise<DemoDisruptionResponse> {
  const url = `${BASE_URL}/admin/demo/simulate-disruption`;
  const response = await axios.post<DemoDisruptionResponse>(url, body, {
    headers: adminHeaders,
  });
  return response.data;
}

/** Return all monitored zones grouped by city. */
export async function getDemoZones(): Promise<DemoZonesResponse> {
  const url = `${BASE_URL}/admin/demo/zones`;
  const response = await axios.get<DemoZonesResponse>(url, { headers: adminHeaders });
  return response.data;
}

// ─── E2E Health Check ─────────────────────────────────────────────────────────

export interface E2EStepResult {
  step:       string;
  status:     'ok' | 'failed' | 'skipped';
  latency_ms: number;
  detail:     string;
}

export interface E2EHealthResponse {
  status:   'healthy' | 'degraded';
  steps:    E2EStepResult[];
  total_ms: number;
}

/** Run the end-to-end pipeline health check. */
export async function runE2EHealthCheck(): Promise<E2EHealthResponse> {
  const url = `${BASE_URL.replace('/api/v1', '')}/health/e2e`;
  const response = await axios.get<E2EHealthResponse>(url, { headers: adminHeaders });
  return response.data;
}
