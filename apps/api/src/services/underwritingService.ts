import { RiskSegment, Worker } from "../types.js";

export function evaluateEligibility(worker: Worker): { eligible: boolean; reason?: string } {
  if (worker.accountAgeDays < 30) return { eligible: false, reason: "ACCOUNT_AGE_TOO_LOW" };
  if (worker.activeHours14d < 40) return { eligible: false, reason: "ACTIVITY_TOO_LOW" };
  if (!worker.payoutAccountVerified) return { eligible: false, reason: "PAYOUT_ACCOUNT_NOT_VERIFIED" };
  if (worker.locationConsistency < 0.7) return { eligible: false, reason: "LOCATION_CONSISTENCY_LOW" };
  return { eligible: true };
}

export function deriveRiskSegment(worker: Worker): RiskSegment {
  if (worker.locationConsistency >= 0.9 && worker.activeHours14d >= 60) return "low";
  if (worker.locationConsistency >= 0.75) return "medium";
  return "high";
}

export function coverageCapBySegment(segment: RiskSegment, plan: "basic" | "standard" | "pro"): number {
  const base = segment === "low" ? 2500 : segment === "medium" ? 1800 : 1200;
  if (plan === "basic") return base;
  if (plan === "standard") return Math.floor(base * 1.4);
  return Math.floor(base * 1.8);
}
