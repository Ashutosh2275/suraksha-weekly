import { v4 as uuid } from "uuid";
import { repository } from "../data/repository.js";
import { claimBurstDetected, createClaim, hasRecentSimilarClaim, upsertClaimStatus } from "./claimService.js";
import { scoreFraud } from "./fraudService.js";
import { idempotencyKey, processPayout } from "./payoutService.js";
import { TriggerEvent } from "../types.js";

export function requiresWaitingPeriod(triggerType: string): boolean {
  return ["heavy_rain", "severe_pollution", "local_restriction", "curfew"].includes(triggerType);
}

export function createTriggerEvent(payload: Omit<TriggerEvent, "id" | "createdAt">): TriggerEvent {
  return repository.createTrigger({
    id: uuid(),
    ...payload,
    createdAt: new Date().toISOString()
  });
}

export function autoInitiateClaimsForTrigger(trigger: TriggerEvent) {
  const eligiblePolicies = repository
    .listPolicies()
    .filter((policy) => policy.status === "active" && policy.zone === trigger.zone && policy.endsAt > trigger.createdAt);

  return eligiblePolicies.map((policy) => {
    const worker = repository.getWorker(policy.workerId);
    if (!worker) {
      return { policyId: policy.id, outcome: "worker_missing" as const };
    }

    const policyStartedAt = new Date(policy.startsAt).getTime();
    const triggerTime = new Date(trigger.createdAt).getTime();
    const triggerType = trigger.normalizedType || trigger.type;
    const withinWaitingPeriod = requiresWaitingPeriod(triggerType) && triggerTime - policyStartedAt < policy.waitingPeriodHours * 60 * 60 * 1000;
    if (withinWaitingPeriod) {
      return { policyId: policy.id, outcome: "waiting_period" as const };
    }

    if (worker.activeHours14d < 40) {
      return { policyId: policy.id, outcome: "insufficient_exposure" as const };
    }

    if (hasRecentSimilarClaim(worker.id, policy.id, triggerType, trigger.createdAt, 30)) {
      return { policyId: policy.id, outcome: "duplicate_window" as const };
    }

    const payoutAmount = Math.min(policy.weeklyCoverageCap, Math.round(policy.weeklyCoverageCap * trigger.confidence));
    const claim = createClaim(worker.id, policy.id, trigger.id, trigger.type, payoutAmount, ["AUTO_INITIATED_FROM_TRIGGER"]);

    if (claimBurstDetected(worker.id, trigger.createdAt, 60, 3)) {
      const updated = upsertClaimStatus(claim.id, "in_review", claim.riskScore, ["CLAIM_BURST_DETECTED", "HOLD_AND_REVIEW"]);
      return { policyId: policy.id, outcome: "in_review" as const, claim: updated };
    }

    const fraud = scoreFraud(worker, { triggerEventId: trigger.id, payoutAmount });

    if (fraud.decision === "critical") {
      const updated = upsertClaimStatus(claim.id, "rejected", fraud.score, [...fraud.reasons, "CRITICAL_MISMATCH_AUTO_BLOCK"]);
      return { policyId: policy.id, outcome: "rejected" as const, claim: updated };
    }

    if (fraud.decision === "high" || fraud.decision === "medium") {
      const updated = upsertClaimStatus(claim.id, "in_review", fraud.score, [...fraud.reasons, "HOLD_AND_REVIEW"]);
      return { policyId: policy.id, outcome: "in_review" as const, claim: updated };
    }

    upsertClaimStatus(claim.id, "approved", fraud.score, [...fraud.reasons, "AUTO_APPROVED"]);
    const payout = processPayout(claim.id, worker.id, idempotencyKey(worker.id, policy.id, trigger.id), payoutAmount);
    if (payout.status === "success") {
      const paid = upsertClaimStatus(claim.id, "paid", fraud.score, ["PAYOUT_PROCESSED"]);
      return { policyId: policy.id, outcome: "paid" as const, claim: paid, payout };
    }
    const approvedClaim = repository.getClaim(claim.id);
    return { policyId: policy.id, outcome: payout.status === "pending" ? "payout_pending" as const : "payout_failed" as const, claim: approvedClaim, payout };
  });
}