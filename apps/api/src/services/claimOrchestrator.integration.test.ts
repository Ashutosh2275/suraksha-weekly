import { beforeEach, describe, expect, it } from "vitest";
import { repository, resetRepository } from "../data/repository.js";
import { resetStore } from "../data/store.js";
import { ClaimOrchestrator } from "./claimOrchestrator.js";
import { Policy, TriggerEvent, Worker } from "../types.js";

class PublisherCapture {
  events: Array<{ name: "claim.initiated" | "surge_mode.activated"; payload: Record<string, unknown> }> = [];

  emit(name: "claim.initiated" | "surge_mode.activated", payload: Record<string, unknown>) {
    this.events.push({ name, payload });
  }
}

const fixedNow = new Date("2026-04-02T08:00:00.000Z");

function mkWorker(id: string, zone = "zone_1"): Worker {
  return {
    id,
    phone: `99999${id.padStart(5, "0")}`,
    city: "Bengaluru",
    zone,
    zoneIds: [zone],
    accountAgeDays: 120,
    activeHours14d: 72,
    avgWeeklyEarnings: 7000,
    payoutAccountVerified: true,
    locationConsistency: 0.92,
    trustScore: 760
  };
}

function mkPolicy(id: string, workerId: string, zone = "zone_1", overrides: Partial<Policy> = {}): Policy {
  return {
    id,
    workerId,
    city: "Bengaluru",
    zone,
    zoneIds: [zone],
    plan: "standard",
    premium: 190,
    weeklyCoverageCap: 2500,
    coverageLimit: 2500,
    startsAt: "2026-04-01T00:00:00.000Z",
    endsAt: "2026-04-10T00:00:00.000Z",
    waitingPeriodHours: 24,
    waitingPeriodEndsAt: "2026-04-01T12:00:00.000Z",
    status: "active",
    ...overrides
  };
}

function mkTrigger(overrides: Partial<TriggerEvent> = {}): TriggerEvent {
  return {
    id: "trigger-1",
    type: "HEAVY_RAIN",
    normalizedType: "heavy_rain",
    source: "weather",
    zone: "zone_1",
    confidence: 0.95,
    severityFactor: 1.3,
    eventStart: "2026-04-02T07:00:00.000Z",
    eventEnd: "2026-04-02T08:00:00.000Z",
    isConfirmed: true,
    sourceData: { estimatedLostHours: 4 },
    createdAt: "2026-04-02T08:00:00.000Z",
    ...overrides
  };
}

describe("claimOrchestrator integration", () => {
  beforeEach(() => {
    resetStore();
    resetRepository();
  });

  it("initiates claim when eligibility checks pass", () => {
    const publisher = new PublisherCapture();
    const orchestrator = new ClaimOrchestrator({
      repo: repository,
      publisher,
      now: () => new Date(fixedNow)
    });

    repository.createWorker(mkWorker("1"));
    repository.createPolicy(mkPolicy("policy-1", "1"));

    const summary = orchestrator.consumeTriggerConfirmed(mkTrigger());

    expect(summary.initiatedClaims).toBe(1);
    expect(repository.listClaims()).toHaveLength(1);
    expect(publisher.events.filter((evt) => evt.name === "claim.initiated")).toHaveLength(1);
  });

  it("blocks claim initiation during waiting period", () => {
    const publisher = new PublisherCapture();
    const orchestrator = new ClaimOrchestrator({ repo: repository, publisher, now: () => new Date(fixedNow) });

    repository.createWorker(mkWorker("2"));
    repository.createPolicy(mkPolicy("policy-2", "2", "zone_1", {
      waitingPeriodEndsAt: "2026-04-03T00:00:00.000Z"
    }));

    const summary = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-wait" }));

    expect(summary.initiatedClaims).toBe(0);
    expect(summary.skippedWaitingPeriod).toBe(1);
    expect(repository.listClaims()).toHaveLength(0);
  });

  it("blocks claim initiation on zone mismatch", () => {
    const publisher = new PublisherCapture();
    const orchestrator = new ClaimOrchestrator({ repo: repository, publisher, now: () => new Date(fixedNow) });

    repository.createWorker(mkWorker("3", "zone_2"));
    repository.createPolicy(mkPolicy("policy-3", "3", "zone_1", { zoneIds: ["zone_1"] }));

    const summary = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-zone" }));

    expect(summary.initiatedClaims).toBe(0);
    expect(summary.skippedZoneMismatch).toBe(1);
    expect(repository.listClaims()).toHaveLength(0);
  });

  it("prevents duplicate claim creation for same worker+policy+trigger", () => {
    const publisher = new PublisherCapture();
    const orchestrator = new ClaimOrchestrator({ repo: repository, publisher, now: () => new Date(fixedNow) });

    repository.createWorker(mkWorker("4"));
    repository.createPolicy(mkPolicy("policy-4", "4"));

    repository.createClaim({
      id: "existing-claim",
      workerId: "4",
      policyId: "policy-4",
      triggerEventId: "trigger-dup",
      triggerType: "heavy_rain",
      status: "initiated",
      riskScore: 0,
      payoutAmount: 1000,
      decisionReasons: ["SEED"],
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    });

    const summary = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-dup" }));

    expect(summary.initiatedClaims).toBe(0);
    expect(summary.skippedDuplicate).toBe(1);
    expect(repository.listClaims()).toHaveLength(1);
  });

  it("activates surge mode after 200 claim initiations in 5-minute window", () => {
    const publisher = new PublisherCapture();
    let now = new Date(fixedNow);
    const orchestrator = new ClaimOrchestrator({ repo: repository, publisher, now: () => now });

    for (let i = 0; i < 210; i += 1) {
      const workerId = `${i + 10}`;
      const policyId = `policy-${i + 10}`;
      repository.createWorker(mkWorker(workerId));
      repository.createPolicy(mkPolicy(policyId, workerId));
    }

    const summary = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-surge" }));

    expect(summary.pausedBySurgeMode).toBe(true);
    expect(summary.initiatedClaims).toBe(201);
    expect(publisher.events.some((evt) => evt.name === "surge_mode.activated")).toBe(true);

    const afterPause = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-surge-2" }));
    expect(afterPause.pausedBySurgeMode).toBe(true);
    expect(afterPause.initiatedClaims).toBe(0);

    orchestrator.acknowledgeSurgeMode("risk-admin-1");
    // Keep only one eligible active policy so acknowledgment behavior can be observed
    const allPolicies = repository.listPolicies();
    allPolicies.slice(1).forEach((policy) => {
      repository.updatePolicy({ ...policy, status: "cancelled" });
    });

    now = new Date(now.getTime() + 6 * 60 * 1000);
    const resumed = orchestrator.consumeTriggerConfirmed(mkTrigger({ id: "trigger-surge-3" }));
    expect(resumed.pausedBySurgeMode).toBe(false);
    expect(resumed.initiatedClaims).toBe(1);
  });
});
