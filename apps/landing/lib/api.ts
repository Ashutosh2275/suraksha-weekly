/**
 * Central API wrapper for Suraksha Weekly frontend.
 * All backend calls go through this module.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/** Typed API error with HTTP status code */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  /** Bearer token from NextAuth session */
  token?: string;
  /** Request body (auto-serialised to JSON) */
  body?: unknown;
}

/**
 * Generic fetch wrapper that handles auth headers, JSON serialisation,
 * and typed error responses.
 *
 * @param path  API path relative to the base URL (e.g. "/auth/request-otp")
 * @param opts  Extended fetch options including optional token and body
 * @returns     Parsed JSON response typed as T
 * @throws      ApiError on non-2xx responses
 */
export async function apiFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const { token, body, headers: extraHeaders, ...rest } = opts;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { detail?: string };
      detail = err.detail ?? detail;
    } catch {
      // ignore parse error, keep default message
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ─── Typed endpoint helpers ──────────────────────────────────────────────────

/** POST /auth/request-otp */
export async function requestOtp(phone: string) {
  return apiFetch<{ status: number; message: string; otp?: string }>(
    '/auth/request-otp',
    { method: 'POST', body: { phone } },
  );
}

/** POST /auth/verify-otp — returns { status, data: { token, worker } } */
export async function verifyOtp(payload: {
  phone: string;
  otp: string;
  name: string;
  city: string;
  service_zones: string[];
  platform_type: string;
  avg_daily_hours: number;
  avg_weekly_earnings: number;
}) {
  return apiFetch<{
    status: number;
    data: {
      token: string;
      worker: {
        id: string;
        phone: string;
        name: string;
        city: string;
        service_zones: string[];
        platform_type: string;
        trust_score: number;
        trust_tier: string;
      };
    };
  }>('/auth/verify-otp', { method: 'POST', body: payload });
}

/** GET /pricing/quote */
export async function getPricingQuote(workerId: string, token: string) {
  return apiFetch<{
    worker_id: string;
    plans: Array<{
      plan_variant: string;
      weekly_premium: number;
      coverage_cap: number;
      risk_multiplier: number;
    }>;
    risk_factors: { location: number; exposure: number; platform: number };
  }>(`/pricing/quote?worker_id=${workerId}`, { token });
}

/** POST /policies — purchase a policy */
export async function purchasePolicy(
  payload: {
    plan_variant: string;
    weekly_premium: number;
    coverage_cap: number;
  },
  token: string,
) {
  return apiFetch<{ id: string; status: string; plan_variant: string }>(
    '/policies',
    { method: 'POST', body: payload, token },
  );
}

/** GET /policies — list active policies for current worker */
export async function getPolicies(token: string) {
  return apiFetch<{ policies: unknown[] }>('/policies', { token });
}

// ─── Domain interfaces ────────────────────────────────────────────────────────

/** Policy record returned by /policies */
export interface PolicyData {
  id: string;
  plan_variant: 'basic' | 'standard' | 'pro';
  status: string;
  weekly_premium: number;
  coverage_cap: number;
  start_date: string;
  end_date: string;
  renewal_count: number;
  worker_id: string;
}

/** Single claim record */
export interface ClaimData {
  id: string;
  worker_id: string;
  policy_id: string;
  trigger_event_id: string;
  status: 'initiated' | 'in_review' | 'approved' | 'paid' | 'rejected' | 'blocked';
  fraud_score: number;
  fraud_reason_tags: string[];
  payout_amount: number;
  idempotency_key: string;
  initiated_at: string;
  resolved_at: string | null;
}

/** Paginated claims list */
export interface ClaimsListResponse {
  total: number;
  page: number;
  limit: number;
  claims: ClaimData[];
}

/** Single payout record */
export interface PayoutData {
  id: string;
  claim_id: string;
  amount: number;
  gateway: string;
  gateway_ref: string | null;
  status: string;
  trigger_type: string | null;
  zone: string | null;
  initiated_at: string;
  confirmed_at: string | null;
}

/** Paginated payouts list */
export interface PayoutsListResponse {
  total: number;
  page: number;
  limit: number;
  payouts: PayoutData[];
}

/** Live trigger event */
export interface TriggerData {
  id: string;
  type: 'HeavyRain' | 'ExtremeHeat' | 'SeverePollution' | 'LocalRestriction' | 'PlatformOutage';
  zone: string;
  value: number;
  threshold: number;
  confidence_score: number;
  sources: string[];
  status: string;
  triggered_at: string;
  audit_snapshot: Record<string, unknown>;
}

/** Active triggers response */
export interface ActiveTriggersResponse {
  count: number;
  triggers: TriggerData[];
}

export interface ApplyClaimRequest {
  trigger_event_id?: string;
}

export interface ApplyClaimResponse {
  claim: ClaimData;
  message: string;
}

// ─── New typed endpoint helpers ───────────────────────────────────────────────

/**
 * GET /policies?status=active&limit=1
 * Returns the worker's active policy (if any).
 */
export async function getActivePolicies(token: string) {
  return apiFetch<{ policies: PolicyData[] }>('/policies?status=active&limit=1', { token });
}

/**
 * GET /claims — paginated list of claims for the authenticated worker.
 * @param token  Bearer token
 * @param page   1-based page number (default 1)
 * @param limit  Results per page (default 20)
 */
export async function getClaims(token: string, page = 1, limit = 20) {
  return apiFetch<ClaimsListResponse>(`/claims?page=${page}&limit=${limit}`, { token });
}

/**
 * POST /claims/:id/appeal — submit an appeal for a rejected or blocked claim.
 * @param claimId  UUID of the claim to appeal
 * @param reason   Free-text reason from the worker
 * @param token    Bearer token
 */
export async function appealClaim(claimId: string, reason: string, token: string) {
  return apiFetch<{ id: string; status: string }>(`/claims/${claimId}/appeal`, {
    method: 'POST',
    body: { reason },
    token,
  });
}

/**
 * GET /payouts — paginated payout history for the authenticated worker.
 * @param token  Bearer token
 * @param page   1-based page number (default 1)
 * @param limit  Results per page (default 20)
 */
export async function getPayouts(token: string, page = 1, limit = 20) {
  return apiFetch<PayoutsListResponse>(`/payouts?page=${page}&limit=${limit}`, { token });
}

/**
 * GET /triggers/active — live trigger events in the worker's monitored zones.
 * @param token  Bearer token
 */
export async function getActiveTriggers(token: string) {
  return apiFetch<ActiveTriggersResponse>('/triggers/active', { token });
}

/**
 * POST /claims/apply — manually apply for a claim against an active trigger.
 * @param token Bearer token
 * @param body  Optional trigger selector
 */
export async function applyClaim(token: string, body: ApplyClaimRequest = {}) {
  return apiFetch<ApplyClaimResponse>('/claims/apply', {
    method: 'POST',
    token,
    body,
  });
}
