"use client";

import { apiClient, createIdempotencyKey } from "@/lib/apiClient";

export type ClaimStatus = "IN_REVIEW" | "APPROVED" | "PAID" | "REJECTED";

export interface PolicySummary {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  coverageStart: string;
  coverageEnd: string;
  zoneCoverage: string[];
  weeklyCoverAmount: number;
}

export interface ActiveAlert {
  isActive: boolean;
  title: string;
  description: string;
}

export interface ClaimItem {
  id: string;
  status: ClaimStatus;
  submittedAt: string;
  payoutAmount: number;
  triggerType: string;
  triggerWindow: string;
  decisionTrace: string;
}

export interface PayoutItem {
  id: string;
  amount: number;
  date: string;
  gatewayReference: string;
  method: string;
  note: string;
}

interface WrappedData<T> {
  data?: T;
}

const fallbackPolicy: PolicySummary = {
  id: "policy-demo-1",
  status: "ACTIVE",
  coverageStart: "2026-04-01",
  coverageEnd: "2026-04-07",
  zoneCoverage: ["Bangalore Central", "Bangalore East"],
  weeklyCoverAmount: 3200,
};

const fallbackAlert: ActiveAlert = {
  isActive: true,
  title: "Heavy Rain Trigger Active",
  description: "Rain alert in your zone. Parametric cover is actively monitoring payout conditions.",
};

const fallbackClaims: ClaimItem[] = [
  {
    id: "CLM-1008",
    status: "PAID",
    submittedAt: "2026-03-21",
    payoutAmount: 1450,
    triggerType: "HEAVY_RAIN",
    triggerWindow: "2026-03-20 10:00 to 14:00",
    decisionTrace: "Trigger met. Policy active. Fraud score low. Auto-approved and paid.",
  },
  {
    id: "CLM-1012",
    status: "IN_REVIEW",
    submittedAt: "2026-03-30",
    payoutAmount: 800,
    triggerType: "SEVERE_POLLUTION",
    triggerWindow: "2026-03-29 09:00 to 13:00",
    decisionTrace: "Trigger met. Manual verification in progress.",
  },
];

const fallbackPayouts: PayoutItem[] = [
  {
    id: "PYT-701",
    amount: 1450,
    date: "2026-03-22",
    gatewayReference: "rzp_demo_98321",
    method: "UPI",
    note: "Settled successfully in 3 mins.",
  },
  {
    id: "PYT-688",
    amount: 980,
    date: "2026-03-11",
    gatewayReference: "rzp_demo_97411",
    method: "UPI",
    note: "Auto reconciliation successful.",
  },
];

export async function getPolicySummary(): Promise<PolicySummary> {
  try {
    const response = await apiClient<WrappedData<PolicySummary>>("/api/v1/policies/current");
    return response.data || fallbackPolicy;
  } catch {
    return fallbackPolicy;
  }
}

export async function getActiveAlert(): Promise<ActiveAlert> {
  try {
    const response = await apiClient<WrappedData<ActiveAlert>>("/api/v1/triggers/active-alert");
    return response.data || fallbackAlert;
  } catch {
    return fallbackAlert;
  }
}

export async function renewPolicy(policyId: string): Promise<{ id: string; status: string }> {
  return apiClient<{ id: string; status: string }>(`/api/v1/policies/${policyId}/renew`, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("renew"),
  });
}

export async function getClaims(): Promise<ClaimItem[]> {
  try {
    const response = await apiClient<WrappedData<ClaimItem[]>>("/api/v1/claims/list");
    return response.data || fallbackClaims;
  } catch {
    return fallbackClaims;
  }
}

export async function getPayouts(): Promise<PayoutItem[]> {
  try {
    const response = await apiClient<WrappedData<PayoutItem[]>>("/api/v1/payouts/history");
    return response.data || fallbackPayouts;
  } catch {
    return fallbackPayouts;
  }
}
