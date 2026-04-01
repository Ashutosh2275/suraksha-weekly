import { v4 as uuid } from "uuid";
import { repository } from "../data/repository.js";
import { Claim, Policy, TriggerEvent, Worker } from "../types.js";
import { enqueueJob } from "./queueService.js";

const WAITING_PERIOD_TRIGGERS = new Set(["heavy_rain", "extreme_heat", "severe_pollution", "local_restriction"]);

type QueuePublisher = {
  emit: (eventName: "claim.initiated" | "surge_mode.activated", payload: Record<string, unknown>) => void;
};

type RepositoryLike = typeof repository;

export type OrchestrationSummary = {
  triggerEventId: string;
  eligiblePolicies: number;
  initiatedClaims: number;
  skippedWaitingPeriod: number;
  skippedZoneMismatch: number;
  skippedCoverageInactive: number;
  skippedDuplicate: number;
  pausedBySurgeMode: boolean;
};

export type ClaimOrchestratorOptions = {
  repo?: RepositoryLike;
  publisher?: QueuePublisher;
  now?: () => Date;
};

function normalizeTriggerType(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function getPolicyZones(policy: Policy): string[] {
  return policy.zoneIds?.length ? policy.zoneIds : [policy.zone];
}

function getWorkerZones(worker: Worker): string[] {
  return worker.zoneIds?.length ? worker.zoneIds : [worker.zone];
}

function intersects(left: string[], right: string[]): boolean {
  const set = new Set(left);
  return right.some((value) => set.has(value));
}

function waitingPeriodEndsAt(policy: Policy): Date {
  if (policy.waitingPeriodEndsAt) {
    return new Date(policy.waitingPeriodEndsAt);
  }
  const startMs = new Date(policy.startsAt).getTime();
  const waitMs = policy.waitingPeriodHours * 60 * 60 * 1000;
  return new Date(startMs + waitMs);
}

function estimatedLostHours(trigger: TriggerEvent): number {
  const fromSourceData = Number((trigger.sourceData || {})["estimatedLostHours"]);
  const fromSnapshot = Number((trigger.snapshot || {})["estimatedLostHours"]);
  const value = Number.isFinite(fromSourceData) && fromSourceData > 0
    ? fromSourceData
    : Number.isFinite(fromSnapshot) && fromSnapshot > 0
      ? fromSnapshot
      : 4;
  return value;
}

function triggerSeverityFactor(trigger: TriggerEvent): number {
  if (typeof trigger.severityFactor === "number" && trigger.severityFactor > 0) {
    return trigger.severityFactor;
  }
  if (typeof trigger.confidence === "number" && trigger.confidence > 0) {
    return trigger.confidence;
  }
  return 1;
}

function workerWeeklyEarnings(worker: Worker): number {
  if (typeof worker.avgWeeklyEarnings === "number" && worker.avgWeeklyEarnings > 0) {
    return worker.avgWeeklyEarnings;
  }
  // Fallback heuristic when weekly earnings are absent.
  return Math.max(1400, Math.round((worker.activeHours14d / 2) * 140));
}

function policyCoverageLimit(policy: Policy): number {
  return typeof policy.coverageLimit === "number" ? policy.coverageLimit : policy.weeklyCoverageCap;
}

class DefaultPublisher implements QueuePublisher {
  emit(eventName: "claim.initiated" | "surge_mode.activated", payload: Record<string, unknown>) {
    enqueueJob({
      id: uuid(),
      type: eventName,
      payload,
      createdAt: new Date().toISOString()
    });
  }
}

export class ClaimOrchestrator {
  private readonly repo: RepositoryLike;
  private readonly publisher: QueuePublisher;
  private readonly now: () => Date;
  private readonly initiatedHistory: number[] = [];
  private surgeModeActive = false;

  constructor(options: ClaimOrchestratorOptions = {}) {
    this.repo = options.repo || repository;
    this.publisher = options.publisher || new DefaultPublisher();
    this.now = options.now || (() => new Date());
  }

  acknowledgeSurgeMode(riskAdminId: string) {
    this.surgeModeActive = false;
    this.repo.audit("surge_mode", riskAdminId, "acknowledged", {
      acknowledgedAt: this.now().toISOString()
    });
  }

  consumeTriggerConfirmed(event: TriggerEvent): OrchestrationSummary {
    return this.orchestrateConfirmedTrigger(event);
  }

  orchestrateConfirmedTrigger(trigger: TriggerEvent): OrchestrationSummary {
    const now = this.now();
    const nowIso = now.toISOString();
    const eventStartIso = trigger.eventStart || trigger.createdAt;
    const eventEndIso = trigger.eventEnd || trigger.createdAt;
    const triggerTypeNormalized = normalizeTriggerType(trigger.normalizedType || trigger.type);

    const summary: OrchestrationSummary = {
      triggerEventId: trigger.id,
      eligiblePolicies: 0,
      initiatedClaims: 0,
      skippedWaitingPeriod: 0,
      skippedZoneMismatch: 0,
      skippedCoverageInactive: 0,
      skippedDuplicate: 0,
      pausedBySurgeMode: false
    };

    if (this.surgeModeActive) {
      summary.pausedBySurgeMode = true;
      return summary;
    }

    const candidates = this.repo
      .listPolicies()
      .filter((policy) => policy.status.toLowerCase() === "active")
      .filter((policy) => new Date(policy.startsAt).getTime() <= new Date(eventEndIso).getTime())
      .filter((policy) => new Date(policy.endsAt).getTime() >= new Date(eventStartIso).getTime())
      .filter((policy) => getPolicyZones(policy).includes(trigger.zone));

    summary.eligiblePolicies = candidates.length;

    for (const policy of candidates) {
      if (this.surgeModeActive) {
        summary.pausedBySurgeMode = true;
        break;
      }

      const worker = this.repo.getWorker(policy.workerId);
      if (!worker) {
        summary.skippedCoverageInactive += 1;
        continue;
      }

      const isActive = policy.status.toLowerCase() === "active";
      const overlapsCoverage = new Date(policy.endsAt).getTime() > new Date(eventStartIso).getTime();
      if (!isActive || !overlapsCoverage) {
        summary.skippedCoverageInactive += 1;
        continue;
      }

      if (!intersects(getWorkerZones(worker), [trigger.zone])) {
        summary.skippedZoneMismatch += 1;
        continue;
      }

      if (WAITING_PERIOD_TRIGGERS.has(triggerTypeNormalized)) {
        const waitUntil = waitingPeriodEndsAt(policy);
        if (now.getTime() < waitUntil.getTime()) {
          summary.skippedWaitingPeriod += 1;
          continue;
        }
      }

      const duplicate = this.repo.findClaim(worker.id, policy.id, trigger.id);
      if (duplicate) {
        summary.skippedDuplicate += 1;
        continue;
      }

      const payout = Math.min(
        policyCoverageLimit(policy),
        (workerWeeklyEarnings(worker) / 7) * estimatedLostHours(trigger) * triggerSeverityFactor(trigger)
      );

      let claim: Claim | undefined;
      try {
        claim = this.repo.createClaim({
          id: uuid(),
          workerId: worker.id,
          policyId: policy.id,
          triggerEventId: trigger.id,
          triggerType: triggerTypeNormalized,
          status: "initiated",
          riskScore: 0,
          payoutAmount: Math.round(payout),
          decisionReasons: ["CLAIM_AUTO_INITIATED"],
          createdAt: nowIso,
          updatedAt: nowIso
        });
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (message.includes("duplicate") || message.includes("unique")) {
          this.repo.audit("claim", `${worker.id}:${policy.id}:${trigger.id}`, "duplicate_skipped", {
            triggerEventId: trigger.id,
            policyId: policy.id,
            workerId: worker.id
          });
          summary.skippedDuplicate += 1;
          continue;
        }
        throw error;
      }

      if (!claim) {
        continue;
      }

      this.repo.appendClaimEvent({
        id: uuid(),
        claimId: claim.id,
        workerId: claim.workerId,
        status: "initiated",
        reason: "CLAIM_INITIATED",
        metadata: {
          triggerEventId: trigger.id,
          zone: trigger.zone,
          payoutAmount: claim.payoutAmount
        },
        createdAt: nowIso
      });

      this.repo.audit("claim", claim.id, "initiated", {
        triggerEventId: trigger.id,
        policyId: claim.policyId,
        workerId: claim.workerId,
        payoutAmount: claim.payoutAmount,
        sourceData: trigger.sourceData || trigger.snapshot || {}
      });

      this.publisher.emit("claim.initiated", {
        claimId: claim.id,
        workerId: claim.workerId,
        policyId: claim.policyId,
        triggerEventId: claim.triggerEventId,
        payoutAmount: claim.payoutAmount,
        createdAt: nowIso
      });

      summary.initiatedClaims += 1;
      this.recordInitiation(now.getTime());

      if (this.initiationsInWindow(now.getTime()) > 200) {
        this.surgeModeActive = true;
        this.publisher.emit("surge_mode.activated", {
          triggerEventId: trigger.id,
          zone: trigger.zone,
          activatedAt: nowIso,
          initiatedInWindow: this.initiationsInWindow(now.getTime()),
          requiresRiskAdminAck: true
        });
        summary.pausedBySurgeMode = true;
        break;
      }
    }

    return summary;
  }

  private recordInitiation(tsMs: number) {
    this.initiatedHistory.push(tsMs);
    this.trimHistory(tsMs);
  }

  private initiationsInWindow(nowMs: number): number {
    this.trimHistory(nowMs);
    return this.initiatedHistory.length;
  }

  private trimHistory(nowMs: number) {
    const cutoff = nowMs - 5 * 60 * 1000;
    while (this.initiatedHistory.length > 0 && this.initiatedHistory[0] < cutoff) {
      this.initiatedHistory.shift();
    }
  }
}

export const claimOrchestrator = new ClaimOrchestrator();
