"use client";

export interface KpiSummary {
  active_policies: number;
  claims_today: number;
  fraud_flags_today: number;
  payout_total_today: number;
  claim_incidence_rate: number;
  fraud_leakage: number;
  auto_approval_rate: number;
}

export interface ReviewQueueItem {
  claim_id: string;
  worker: string;
  zone: string;
  trigger_type: string;
  fraud_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sla_deadline: string;
  status: "IN_REVIEW" | "APPROVED" | "REJECTED";
  reason_tags: string[];
  detail: string;
}

export interface TriggerEvent {
  id: string;
  zone: string;
  city: string;
  trigger_type: string;
  confidence: number;
  active_count: number;
  occurred_at: string;
}

export interface FraudRuleMetric {
  rule: string;
  count: number;
}

export interface SuspiciousCluster {
  cluster_id: string;
  workers: string[];
  shared_device: string;
  shared_handle: string;
  risk_score: number;
}

export interface AuditRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  timestamp: string;
}

const API_BASE_URL = "http://localhost:8000";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchKpis(): Promise<KpiSummary> {
  try {
    const payload = await apiGet<{ data?: KpiSummary }>("/api/v1/admin/metrics/overview");
    if (payload.data) {
      return payload.data;
    }
  } catch {
    // fall through
  }

  return {
    active_policies: 21340,
    claims_today: 287,
    fraud_flags_today: 22,
    payout_total_today: 938400,
    claim_incidence_rate: 13.4,
    fraud_leakage: 0,
    auto_approval_rate: 82.6,
  };
}

export async function fetchLossRatioTrend(): Promise<Array<{ week: string; ratio: number }>> {
  return [
    { week: "W-6", ratio: 44 },
    { week: "W-5", ratio: 46 },
    { week: "W-4", ratio: 43 },
    { week: "W-3", ratio: 47 },
    { week: "W-2", ratio: 45 },
    { week: "W-1", ratio: 42 },
    { week: "W0", ratio: 41 },
  ];
}

export async function fetchReviewQueue(): Promise<ReviewQueueItem[]> {
  try {
    const payload = await apiGet<{ data?: ReviewQueueItem[] }>("/api/v1/admin/review-queue");
    if (payload.data && payload.data.length > 0) {
      return payload.data;
    }
  } catch {
    // fall through
  }

  const now = Date.now();
  return [
    {
      claim_id: "CLM-8931",
      worker: "Aman V",
      zone: "BLR-North",
      trigger_type: "HEAVY_RAIN",
      fraud_score: 0.91,
      risk_tier: "CRITICAL",
      sla_deadline: new Date(now + 5 * 60 * 1000).toISOString(),
      status: "IN_REVIEW",
      reason_tags: ["identity_mismatch", "device_switch"],
      detail: "Multiple recent claims and beneficiary overlap detected.",
    },
    {
      claim_id: "CLM-8926",
      worker: "Riya S",
      zone: "MUM-West",
      trigger_type: "SEVERE_POLLUTION",
      fraud_score: 0.52,
      risk_tier: "MEDIUM",
      sla_deadline: new Date(now + 17 * 60 * 1000).toISOString(),
      status: "IN_REVIEW",
      reason_tags: ["velocity_spike"],
      detail: "Claim amount anomaly flagged for manual validation.",
    },
    {
      claim_id: "CLM-8912",
      worker: "Karthik N",
      zone: "CHE-South",
      trigger_type: "LOCAL_RESTRICTION",
      fraud_score: 0.34,
      risk_tier: "LOW",
      sla_deadline: new Date(now - 4 * 60 * 1000).toISOString(),
      status: "IN_REVIEW",
      reason_tags: ["manual_recheck"],
      detail: "Awaiting zone-level local restriction corroboration.",
    },
  ];
}

export async function decideClaim(claimId: string, decision: "APPROVE" | "REJECT", notes: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/admin/review-queue/${claimId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reviewer_notes: notes }),
  });
}

export async function fetchTriggerFeed(): Promise<TriggerEvent[]> {
  try {
    const payload = await apiGet<{ data?: TriggerEvent[] }>("/api/v1/triggers/recent");
    if (payload.data && payload.data.length > 0) {
      return payload.data;
    }
  } catch {
    // fall through
  }

  return [
    {
      id: "TRG-211",
      zone: "BLR-North",
      city: "Bangalore",
      trigger_type: "HEAVY_RAIN",
      confidence: 0.95,
      active_count: 6,
      occurred_at: "2026-04-02T08:12:00Z",
    },
    {
      id: "TRG-209",
      zone: "MUM-West",
      city: "Mumbai",
      trigger_type: "SEVERE_POLLUTION",
      confidence: 0.88,
      active_count: 4,
      occurred_at: "2026-04-02T08:09:00Z",
    },
    {
      id: "TRG-207",
      zone: "CHE-South",
      city: "Chennai",
      trigger_type: "LOCAL_RESTRICTION",
      confidence: 0.81,
      active_count: 3,
      occurred_at: "2026-04-02T08:05:00Z",
    },
  ];
}

export async function toggleManualRestriction(zone: string, active: boolean): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/admin/triggers/local-restriction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone, active }),
  });
}

export async function fetchFraudScores(): Promise<number[]> {
  return [0.05, 0.09, 0.13, 0.15, 0.22, 0.34, 0.35, 0.38, 0.42, 0.45, 0.51, 0.62, 0.66, 0.74, 0.83, 0.91, 0.94];
}

export async function fetchTopRuleTriggers(): Promise<FraudRuleMetric[]> {
  return [
    { rule: "velocity_check", count: 74 },
    { rule: "beneficiary_reuse", count: 56 },
    { rule: "impossible_travel", count: 42 },
    { rule: "device_change", count: 37 },
    { rule: "policy_timing", count: 29 },
  ];
}

export async function fetchSuspiciousClusters(): Promise<SuspiciousCluster[]> {
  return [
    {
      cluster_id: "CLS-01",
      workers: ["worker-111", "worker-188", "worker-205"],
      shared_device: "device_98AD7",
      shared_handle: "suspicious@upi",
      risk_score: 0.92,
    },
    {
      cluster_id: "CLS-02",
      workers: ["worker-334", "worker-337"],
      shared_device: "device_74KT2",
      shared_handle: "sharedwallet@upi",
      risk_score: 0.79,
    },
  ];
}

export async function fetchAuditLogs(): Promise<AuditRow[]> {
  try {
    const payload = await apiGet<{ data?: AuditRow[] }>("/api/v1/admin/audit/logs");
    if (payload.data && payload.data.length > 0) {
      return payload.data;
    }
  } catch {
    // fall through
  }

  return Array.from({ length: 38 }).map((_, index) => ({
    id: `AUD-${1000 + index}`,
    entity_type: index % 2 === 0 ? "Claim" : "PayoutTransaction",
    entity_id: index % 2 === 0 ? `CLM-${8900 + index}` : `PYT-${700 + index}`,
    action: index % 3 === 0 ? "review_queue_approved" : "state_transition",
    actor: index % 4 === 0 ? "risk_admin" : "system",
    timestamp: new Date(Date.now() - index * 60000).toISOString(),
  }));
}
