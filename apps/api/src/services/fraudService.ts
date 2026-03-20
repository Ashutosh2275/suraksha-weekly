import { store } from "../data/store.js";
import { Claim, FraudContext, Worker } from "../types.js";

export interface FraudCheckResult {
  score: number;
  reasons: string[];
  decision: "low" | "medium" | "high" | "critical";
}

export function getFraudThresholds() {
  return { ...store.fraudThresholds };
}

export function setFraudThresholds(thresholds: Partial<{ critical: number; high: number; medium: number }>) {
  Object.assign(store.fraudThresholds, thresholds);
}

export function scoreFraud(
  worker: Worker,
  claim: Pick<Claim, "triggerEventId" | "payoutAmount">,
  context?: FraudContext
): FraudCheckResult {
  let score = 0;
  const reasons: string[] = [];

  // Core identity and account rules
  if (worker.locationConsistency < 0.75) {
    score += 35;
    reasons.push("LOCATION_TRUST_LOW");
  }

  if (!worker.payoutAccountVerified) {
    score += 80;
    reasons.push("PAYOUT_ACCOUNT_UNVERIFIED");
  }

  if (claim.payoutAmount > 2000) {
    score += 20;
    reasons.push("HIGH_PAYOUT_AMOUNT");
  }

  // Account age check
  if (worker.accountAgeDays < 30) {
    score += 25;
    reasons.push("ACCOUNT_TOO_NEW");
  }

  // Trust score tiers
  if (worker.trustScore < 400) {
    score += 30;
    reasons.push("TRUST_SCORE_CRITICAL");
  } else if (worker.trustScore < 600) {
    score += 15;
    reasons.push("TRUST_SCORE_LOW");
  }

  // Velocity and linked-identity context (optional)
  if (context) {
    if (context.claimsLast24h >= 3) {
      score += 40;
      reasons.push("VELOCITY_HIGH_24H");
    } else if (context.claimsLast24h >= 2) {
      score += 20;
      reasons.push("VELOCITY_ELEVATED_24H");
    }

    if (context.claimsLast7d >= 7) {
      score += 30;
      reasons.push("VELOCITY_HIGH_7D");
    }

    if (context.linkedIdentityMatches >= 2) {
      score += 25;
      reasons.push("LINKED_IDENTITY_CLUSTER");
    }

    if (context.triggerClaimCount >= 5) {
      score += 20;
      reasons.push("TRIGGER_CLAIM_SATURATION");
    }
  }

  const t = store.fraudThresholds;
  let decision: FraudCheckResult["decision"] = "low";
  if (score >= t.critical) decision = "critical";
  else if (score >= t.high) decision = "high";
  else if (score >= t.medium) decision = "medium";

  return { score, reasons, decision };
}
