import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetRepository } from "../data/repository.js";
import { resetStore } from "../data/store.js";
import { resetRateLimiterState } from "../middleware/rateLimit.js";
import { resetObservabilityMetrics } from "../services/observabilityService.js";

describe("API contracts", () => {
  const app = createApp();

  beforeEach(() => {
    resetStore();
    resetRepository();
    resetRateLimiterState();
    resetObservabilityMetrics();
  });

  it("returns health and observability contracts", async () => {
    const live = await request(app).get("/internal/live");
    expect(live.status).toBe(200);
    expect(live.body).toMatchObject({
      status: "ok",
      service: "suraksha-api",
      version: "v1",
      checks: {
        database: expect.any(String),
        cache: expect.any(String),
        queue: expect.any(String),
        fraud_service: expect.any(String)
      },
      degraded: false
    });

    await request(app).get("/");
    await request(app).get("/internal/ready");

    const metrics = await request(app).get("/internal/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.body.metrics.totalRequests).toBeGreaterThanOrEqual(3);
    expect(metrics.body.metrics.methods.GET).toBeGreaterThanOrEqual(3);
    expect(metrics.body.metrics.statuses["200"]).toBeGreaterThanOrEqual(3);
    expect(metrics.body.metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns trigger explanation and estimator contract shape", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9000000001",
      city: "Bengaluru",
      zone: "HSR",
      accountAgeDays: 90,
      activeHours14d: 70,
      payoutAccountVerified: true,
      locationConsistency: 0.9,
      trustScore: 800
    });
    const workerId = workerRes.body.worker.id;

    const policyRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "standard" });

    const triggerExplanations = await request(app).get("/api/v1/content/trigger-explanations");
    expect(triggerExplanations.status).toBe(200);
    expect(Array.isArray(triggerExplanations.body.triggers)).toBe(true);
    expect(triggerExplanations.body.triggers[0]).toMatchObject({
      type: expect.any(String),
      condition: expect.any(String),
      confidenceGuidance: expect.any(String),
      payoutImpact: expect.any(String)
    });

    const estimator = await request(app).post(`/api/v1/workers/${workerId}/payout-estimator`).send({
      policyId: policyRes.body.policy.id,
      triggerType: "heavy_rain",
      lostCoveredHours: 4,
      triggerSeverityFactor: 1.1
    });

    expect(estimator.status).toBe(200);
    expect(estimator.body).toMatchObject({
      workerId,
      policyId: policyRes.body.policy.id,
      triggerType: "heavy_rain",
      estimate: {
        baselineHourlyEarnings: expect.any(Number),
        lostCoveredHours: 4,
        triggerSeverityFactor: 1.1,
        weeklyCoverageCap: expect.any(Number),
        estimatedPayout: expect.any(Number)
      },
      explanation: {
        formula: expect.any(String),
        confidenceHint: expect.any(String),
        termsVersion: expect.any(String)
      }
    });
  });

  it("returns rate-limit headers on throttled route", async () => {
    let throttled;
    for (let i = 0; i < 6; i += 1) {
      throttled = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9000000002" });
    }

    expect(throttled?.status).toBe(429);
    expect(throttled?.headers["retry-after"]).toBeDefined();
    expect(throttled?.headers["x-ratelimit-limit"]).toBeDefined();
    expect(throttled?.headers["x-ratelimit-remaining"]).toBe("0");
  });
});
