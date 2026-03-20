import { v4 as uuid } from "uuid";
import { repository } from "../data/repository.js";
import { Claim, Policy } from "../types.js";

export function createClaim(
  workerId: string,
  policyId: string,
  triggerEventId: string,
  triggerType: string,
  payoutAmount: number,
  decisionReasons: string[] = []
): Claim {
  const existing = repository.findClaim(workerId, policyId, triggerEventId);
  if (existing) {
    return existing;
  }

  const claim: Claim = {
    id: uuid(),
    workerId,
    policyId,
    triggerEventId,
    triggerType,
    payoutAmount,
    status: "initiated",
    riskScore: 0,
    decisionReasons,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const created = repository.createClaim(claim);
  repository.appendClaimEvent({
    id: uuid(),
    claimId: created.id,
    workerId,
    status: "initiated",
    reason: "CLAIM_INITIATED",
    metadata: { triggerType, payoutAmount },
    createdAt: created.createdAt
  });
  return created;
}

export function upsertClaimStatus(
  claimId: string,
  status: Claim["status"],
  riskScore: number,
  decisionReasons?: string[]
): Claim | undefined {
  const existing = repository.getClaim(claimId);
  if (!existing) return undefined;
  existing.status = status;
  existing.riskScore = riskScore;
  existing.updatedAt = new Date().toISOString();
  if (status === "in_review") {
    existing.reviewedAt = existing.updatedAt;
  }
  if (status === "paid") {
    existing.paidAt = existing.updatedAt;
  }
  if (decisionReasons?.length) {
    existing.decisionReasons = [...new Set([...existing.decisionReasons, ...decisionReasons])];
  }
  const updated = repository.updateClaim(existing);
  repository.appendClaimEvent({
    id: uuid(),
    claimId: updated.id,
    workerId: updated.workerId,
    status,
    reason: decisionReasons?.[decisionReasons.length - 1] || "STATUS_UPDATED",
    metadata: { riskScore },
    createdAt: updated.updatedAt || new Date().toISOString()
  });
  return updated;
}

export function withinPolicyExposureWindow(policy: Policy, atIso: string): boolean {
  return policy.startsAt <= atIso && policy.endsAt >= atIso;
}

export function hasRecentSimilarClaim(workerId: string, policyId: string, claimFingerprint: string, atIso: string, withinMinutes = 120): boolean {
  const cutoffTs = new Date(atIso).getTime() - withinMinutes * 60 * 1000;
  return repository.listWorkerClaims(workerId).some((claim) => {
    const claimTs = new Date(claim.createdAt).getTime();
    const sameFingerprint = claim.triggerEventId === claimFingerprint || claim.triggerType === claimFingerprint;
    return claim.policyId === policyId && sameFingerprint && claimTs >= cutoffTs;
  });
}

export function claimBurstDetected(workerId: string, atIso: string, withinMinutes = 60, threshold = 3): boolean {
  const cutoffTs = new Date(atIso).getTime() - withinMinutes * 60 * 1000;
  const burstCount = repository
    .listWorkerClaims(workerId)
    .filter((claim) => claim.status !== "rejected")
    .filter((claim) => new Date(claim.createdAt).getTime() >= cutoffTs).length;
  return burstCount >= threshold;
}
