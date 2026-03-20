import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { repository, resetRepository } from "../data/repository.js";
import { resetStore } from "../data/store.js";
import { resetRateLimiterState } from "../middleware/rateLimit.js";
import { resetJobs } from "../services/queueService.js";
import { createSession } from "../services/authService.js";
import { resetPayoutAdapterMode, setPayoutAdapterMode } from "../services/payoutService.js";

describe("API integration", () => {
  const app = createApp();

  async function loginAdmin() {
    const response = await request(app).post("/api/v1/auth/admin/login").send({
      email: "ops@suraksha.dev",
      password: "Admin@123"
    });

    expect(response.status).toBe(200);
    return response.body.session.accessToken as string;
  }

  beforeEach(() => {
    resetStore();
    resetRepository();
    resetJobs();
    resetRateLimiterState();
    resetPayoutAdapterMode();
  });

  it("returns live and ready status", async () => {
    const live = await request(app).get("/internal/live");
    const ready = await request(app).get("/internal/ready");
    expect(live.status).toBe(200);
    expect(ready.status).toBe(200);
  });

  it("registers worker, returns quote, purchases policy, and pays claim", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "7777777777",
      city: "Bengaluru",
      zone: "Koramangala",
      accountAgeDays: 45,
      activeHours14d: 54,
      payoutAccountVerified: true,
      locationConsistency: 0.86,
      trustScore: 780
    });

    expect(workerRes.status).toBe(201);

    const quoteRes = await request(app).post("/api/v1/policies/quote").send({
      workerId: workerRes.body.worker.id,
      plan: "standard"
    });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.premium).toBeGreaterThan(0);
    expect(quoteRes.body.explainability.breakdown.finalPremium).toBe(quoteRes.body.premium);
    expect(quoteRes.body.explainability.guardrails.floor).toBeGreaterThan(0);
    expect(quoteRes.body.terms.summary).toBeDefined();

    const policyRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "standard"
    });
    expect(policyRes.status).toBe(201);
    expect(policyRes.body.terms.inclusions.length).toBeGreaterThan(0);

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: policyRes.body.policy.id,
      triggerEventId: "event-1",
      requestedAmount: 700
    });
    expect(claimRes.status).toBe(201);
    expect(claimRes.body.payout.status).toBe("success");
    expect(claimRes.body.explanation.decision).toBe("paid");
  });

  it("enforces rate limiting on OTP endpoint", async () => {
    let lastStatus = 200;
    for (let index = 0; index < 6; index += 1) {
      const res = await request(app).post("/api/v1/auth/otp/request");
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("supports OTP verification and worker profile update", async () => {
    const otpRequest = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9999999999" });
    expect(otpRequest.status).toBe(200);

    const otpVerify = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9999999999", code: "1234" });
    expect(otpVerify.status).toBe(200);
    expect(otpVerify.body.session.accessToken).toBeTruthy();

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9999999999",
      city: "Pune",
      zone: "Baner",
      accountAgeDays: 80,
      activeHours14d: 70,
      payoutAccountVerified: true,
      locationConsistency: 0.91,
      trustScore: 820
    });

    const workerId = workerRes.body.worker.id;
    const updateRes = await request(app).patch(`/api/v1/workers/${workerId}/profile`).send({ zone: "Wakad", trustScore: 830 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.worker.zone).toBe("Wakad");
  });

  it("supports onboarding upsert and risk-profile CRUD", async () => {
    const otpVerify = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9999999999" });
    expect(otpVerify.status).toBe(200);

    const workerSession = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9999999999", code: "1234" });
    expect(workerSession.status).toBe(200);
    const accessToken = workerSession.body.session.accessToken;

    const onboarding = await request(app)
      .post("/api/v1/workers/onboarding")
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        phone: "9999999999",
        city: "Bengaluru",
        zone: "Koramangala",
        serviceZones: ["Koramangala", "HSR"],
        fullName: "Asha Rao",
        dob: "1997-01-01",
        gender: "female",
        emergencyContact: "9876543210",
        aadhaar4: "1234",
        pan4: "5678",
        riderId: "RID-100",
        platformType: "swiggy",
        vehicleType: "bike",
        ordersPerDay: 18,
        averageDailyOnlineHours: 7,
        activeHoursWeek: 42,
        activeHours14d: 84,
        weeklyIncome4w: 5200,
        averageWeeklyEarnings: 5200,
        volatilityBand: "medium",
        payoutCycle: "weekly",
        cashShare: 15,
        digitalShare: 85,
        nominee: "Rohit Rao",
        upiId: "asha@upi",
        bank4: "9876",
        accountAgeDays: 60,
        locationConsistency: 0.88,
        trustScore: 760,
        payoutAccountVerified: true,
        kycVerified: true,
        consentAccepted: true,
        triggerDisclosureAccepted: true
      });

    expect(onboarding.status).toBe(201);
    expect(onboarding.body.profileCompleteness.percentage).toBeGreaterThan(80);

    const workerId = onboarding.body.worker.id;

    const getRiskProfile = await request(app)
      .get(`/api/v1/workers/${workerId}/risk-profile`)
      .set("authorization", `Bearer ${accessToken}`);
    expect(getRiskProfile.status).toBe(200);
    expect(getRiskProfile.body.riskProfile.platformType).toBe("swiggy");

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const updateRiskProfile = await request(app)
      .put(`/api/v1/workers/${workerId}/risk-profile`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        ...getRiskProfile.body.riskProfile,
        serviceZones: ["Koramangala", "HSR", "Indiranagar"],
        averageWeeklyEarnings: 5600,
        weeklyIncome4w: 5600,
        updatedAt: undefined
      });
    expect(updateRiskProfile.status).toBe(200);
    expect(updateRiskProfile.body.riskProfile.averageWeeklyEarnings).toBe(5600);

    const profileRes = await request(app).get(`/api/v1/workers/${workerId}/profile`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.riskProfile.serviceZones.length).toBe(3);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const deleteRiskProfile = await request(app)
      .delete(`/api/v1/workers/${workerId}/risk-profile`)
      .set("authorization", `Bearer ${accessToken}`);
    expect(deleteRiskProfile.status).toBe(200);
  });

  it("allows internal trigger ingestion only with internal header", async () => {
    const unauthorized = await request(app).post("/api/v1/triggers/ingest").send({ type: "rain", zone: "Koramangala" });
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .post("/api/v1/triggers/ingest")
      .set("x-internal-service", "dev-internal-key")
      .send({ type: "rain", zone: "Koramangala", source: "weather" });

    expect(authorized.status).toBe(202);
    expect(authorized.body.event.type).toBe("rain");
    expect(authorized.body.event.normalizedType).toBe("heavy_rain");
    expect(authorized.body.event.source).toBe("weather");
    expect(authorized.body.event.adapter).toBe("weather-mock");
    expect(typeof authorized.body.event.confidence).toBe("number");
    expect(authorized.body.intelligence.snapshot.rainMm).toBeGreaterThan(0);
  });

  it("supports batch trigger ingestion with degraded-mode reporting", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "3333333333",
      city: "Bengaluru",
      zone: "HSR",
      accountAgeDays: 90,
      activeHours14d: 75,
      payoutAccountVerified: true,
      locationConsistency: 0.95,
      trustScore: 840
    });

    await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "standard"
    });

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const batch = await request(app)
      .post("/api/v1/triggers/ingest/batch")
      .set("x-internal-service", "dev-internal-key")
      .send({
        events: [
          { type: "storm", zone: "HSR", source: "weather" },
          { type: "smog", zone: "HSR", source: "aqi" },
          { type: "platform_outage", zone: "HSR", source: "platform", signals: { outageScore: 0.85 } },
          { type: "downtime", zone: "HSR", source: "synthetic" }
        ]
      });

    expect(batch.status).toBe(202);
    expect(batch.body.summary.total).toBe(4);
    expect(batch.body.summary.degradedCount).toBeGreaterThan(0);
    expect(batch.body.results[0].event.normalizedType).toBe("heavy_rain");
    expect(batch.body.results[1].event.normalizedType).toBe("severe_pollution");
    expect(batch.body.results[2].event.source).toBe("platform");
    expect(batch.body.results[3].event.degradedMode).toBe(true);
    expect(batch.body.results[0].intelligence.snapshot.rainMm).toBeGreaterThan(0);
    expect(batch.body.results[1].intelligence.snapshot.aqi).toBeGreaterThan(0);
  });

  it("supports policy renewal, cancellation, and duplicate-claim protection", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "6666666666",
      city: "Bengaluru",
      zone: "Indiranagar",
      accountAgeDays: 61,
      activeHours14d: 58,
      payoutAccountVerified: true,
      locationConsistency: 0.89,
      trustScore: 760
    });

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "standard"
    });

    const activePolicyId = purchaseRes.body.policy.id;
    const firstClaim = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: activePolicyId,
      triggerEventId: "manual-duplicate",
      requestedAmount: 400
    });
    expect(firstClaim.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const duplicate = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: activePolicyId,
      triggerEventId: "manual-duplicate",
      requestedAmount: 400
    });
    expect(duplicate.status).toBe(409);

    const renewedRes = await request(app).post(`/api/v1/policies/${purchaseRes.body.policy.id}/renew`).send({});
    expect(renewedRes.status).toBe(201);

    const cancelRes = await request(app).post(`/api/v1/policies/${purchaseRes.body.policy.id}/cancel`).send({});
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.policy.status).toBe("cancelled");

    const timeline = await request(app).get(`/api/v1/claims/${firstClaim.body.claim.id}/timeline`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.events.length).toBeGreaterThan(1);
    expect(timeline.body.events[0].status).toBe("initiated");

    const retentionRes = await request(app)
      .get("/api/v1/admin/retention")
      .set("authorization", `Bearer ${await loginAdmin()}`);
    expect(retentionRes.status).toBe(200);
    expect(retentionRes.body.retention.purchases).toBeGreaterThan(0);
    expect(retentionRes.body.retention.renewals).toBeGreaterThan(0);
    expect(retentionRes.body.retention.cancellations).toBeGreaterThan(0);
  });

  it("enforces exposure-window checks and claim burst hold-and-review", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "3222222222",
      city: "Bengaluru",
      zone: "Marathahalli",
      accountAgeDays: 110,
      activeHours14d: 76,
      payoutAccountVerified: true,
      locationConsistency: 0.93,
      trustScore: 880
    });

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "standard"
    });
    expect(purchaseRes.status).toBe(201);

    const originalPolicy = repository.getPolicy(purchaseRes.body.policy.id)!;
    repository.updatePolicy({
      ...originalPolicy,
      endsAt: new Date(Date.now() - 60 * 1000).toISOString()
    });

    const outOfWindow = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: originalPolicy.id,
      triggerEventId: "expired-window-event",
      requestedAmount: 500
    });
    expect(outOfWindow.status).toBe(422);
    expect(outOfWindow.body.error_code).toBe("EXPOSURE_WINDOW_CLOSED");

    repository.updatePolicy({
      ...originalPolicy,
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    const now = Date.now();
    repository.createClaim({
      id: "seed-claim-1",
      workerId: workerRes.body.worker.id,
      policyId: originalPolicy.id,
      triggerEventId: "seed-trigger-1",
      triggerType: "manual",
      status: "paid",
      riskScore: 8,
      payoutAmount: 200,
      decisionReasons: ["SEED"],
      createdAt: new Date(now - 10 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 10 * 60 * 1000).toISOString(),
      paidAt: new Date(now - 10 * 60 * 1000).toISOString()
    });
    repository.createClaim({
      id: "seed-claim-2",
      workerId: workerRes.body.worker.id,
      policyId: originalPolicy.id,
      triggerEventId: "seed-trigger-2",
      triggerType: "manual",
      status: "in_review",
      riskScore: 42,
      payoutAmount: 220,
      decisionReasons: ["SEED"],
      createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 5 * 60 * 1000).toISOString(),
      reviewedAt: new Date(now - 5 * 60 * 1000).toISOString()
    });

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const burstClaim = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: originalPolicy.id,
      triggerEventId: "burst-event-3",
      requestedAmount: 450
    });

    expect(burstClaim.status).toBe(202);
    expect(burstClaim.body.claim.status).toBe("in_review");
    expect(burstClaim.body.explanation.checks.burstControlTriggered).toBe(true);
  });

  it("supports reminder scheduling, reminder send, and policy lifecycle listing", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "4444444444",
      city: "Bengaluru",
      zone: "Whitefield",
      accountAgeDays: 75,
      activeHours14d: 64,
      payoutAccountVerified: true,
      locationConsistency: 0.9,
      trustScore: 790
    });

    const workerId = workerRes.body.worker.id;

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId,
      plan: "basic"
    });
    expect(purchaseRes.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const duplicatePurchase = await request(app).post("/api/v1/policies/purchase").send({
      workerId,
      plan: "basic"
    });
    expect(duplicatePurchase.status).toBe(409);

    const scheduleRes = await request(app).post(`/api/v1/workers/${workerId}/reminders/schedule`).send({ withinHours: 168 });
    expect(scheduleRes.status).toBe(201);
    expect(scheduleRes.body.reminders.length).toBeGreaterThan(0);

    const listRemindersRes = await request(app).get(`/api/v1/workers/${workerId}/reminders`);
    expect(listRemindersRes.status).toBe(200);
    expect(listRemindersRes.body.reminders.length).toBeGreaterThan(0);

    const sendReminderRes = await request(app).post(`/api/v1/policies/reminders/${listRemindersRes.body.reminders[0].id}/send`).send({});
    expect(sendReminderRes.status).toBe(200);
    expect(sendReminderRes.body.reminder.status).toBe("sent");

    const workerPoliciesRes = await request(app).get(`/api/v1/workers/${workerId}/policies`);
    expect(workerPoliciesRes.status).toBe(200);
    expect(workerPoliciesRes.body.policies[0].lifecycleState).toBeDefined();

    const allPoliciesRes = await request(app).get(`/api/v1/policies?workerId=${workerId}`);
    expect(allPoliciesRes.status).toBe(200);
    expect(allPoliciesRes.body.policies.length).toBeGreaterThan(0);

    const adminToken = await loginAdmin();
    const lapseRunRes = await request(app)
      .post("/api/v1/policies/lapse/run")
      .set("authorization", `Bearer ${adminToken}`)
      .send({});
    expect(lapseRunRes.status).toBe(200);
    expect(lapseRunRes.body.report.checked).toBeGreaterThanOrEqual(0);
    expect(lapseRunRes.body.report.lapsed).toBeGreaterThanOrEqual(0);
  });

  it("auto-initiates claim outcomes for active policies on trusted trigger ingestion", async () => {
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "5555555555",
      city: "Bengaluru",
      zone: "HSR",
      accountAgeDays: 90,
      activeHours14d: 72,
      payoutAccountVerified: true,
      locationConsistency: 0.94,
      trustScore: 860
    });

    await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "basic"
    });

    const triggerRes = await request(app)
      .post("/api/v1/triggers/ingest")
      .set("x-internal-service", "dev-internal-key")
      .send({ type: "platform_outage", zone: "HSR", confidence: 0.9 });

    expect(triggerRes.status).toBe(202);
    expect(triggerRes.body.claims.length).toBe(1);
    expect(["paid", "in_review", "rejected"]).toContain(triggerRes.body.claims[0].outcome);
  });

  it("returns plans, worker dashboard, and admin overview", async () => {
    const adminToken = await loginAdmin();

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "8888888888",
      city: "Mumbai",
      zone: "Andheri",
      accountAgeDays: 60,
      activeHours14d: 62,
      payoutAccountVerified: true,
      locationConsistency: 0.9,
      trustScore: 710
    });

    const workerId = workerRes.body.worker.id;

    await request(app).post("/api/v1/policies/purchase").send({
      workerId,
      plan: "basic"
    });

    const plansRes = await request(app).get("/api/v1/plans");
    expect(plansRes.status).toBe(200);
    expect(Object.keys(plansRes.body.plans)).toEqual(["basic", "standard", "pro"]);

    const dashboardRes = await request(app).get(`/api/v1/workers/${workerId}/dashboard`);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.worker.id).toBe(workerId);
    expect(dashboardRes.body.policies.length).toBe(1);
    expect(Array.isArray(dashboardRes.body.reminders)).toBe(true);
    expect(dashboardRes.body.protection).toBeDefined();

    const overviewRes = await request(app).get("/api/v1/admin/overview").set("authorization", `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.metrics.totals.workers).toBe(1);
    expect(overviewRes.body.jobs).toBeDefined();
    expect(overviewRes.body.auditLogs.length).toBeGreaterThan(0);
  });

  it("returns coverage terms and glossary content", async () => {
    const coverageTermsRes = await request(app).get("/api/v1/content/coverage-terms");
    expect(coverageTermsRes.status).toBe(200);
    expect(coverageTermsRes.body.transparentTerms.length).toBeGreaterThan(0);

    const glossaryRes = await request(app).get("/api/v1/content/policy-glossary");
    expect(glossaryRes.status).toBe(200);
    expect(glossaryRes.body.glossary.covered_hours).toBeDefined();
  });

  it("enforces admin authorization and supports session refresh", async () => {
    const unauthorized = await request(app).get("/api/v1/admin/metrics");
    expect(unauthorized.status).toBe(401);

    const loginRes = await request(app).post("/api/v1/auth/admin/login").send({
      email: "ops@suraksha.dev",
      password: "Admin@123"
    });
    expect(loginRes.status).toBe(200);

    const metrics = await request(app).get("/api/v1/admin/metrics").set("authorization", `Bearer ${loginRes.body.session.accessToken}`);
    expect(metrics.status).toBe(200);

    const refresh = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: loginRes.body.session.refreshToken });
    expect(refresh.status).toBe(200);

    const me = await request(app).get("/api/v1/auth/me").set("authorization", `Bearer ${refresh.body.session.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.session.role).toBe("risk-admin");
  });

  it("expands fraud scoring with account age, trust tier, and velocity checks", async () => {
    // New account + critically low trust = score 55 (high) => hold-and-review
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "1122334455",
      city: "Bengaluru",
      zone: "Jayanagar",
      accountAgeDays: 10,
      activeHours14d: 48,
      payoutAccountVerified: true,
      locationConsistency: 0.88,
      trustScore: 350
    });
    expect(workerRes.status).toBe(201);

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "basic"
    });
    expect(purchaseRes.status).toBe(201);

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "age-trust-event-1",
      requestedAmount: 500
    });
    // score = ACCOUNT_TOO_NEW(25) + TRUST_SCORE_CRITICAL(30) = 55 => high => in_review
    expect(claimRes.status).toBe(202);
    expect(claimRes.body.claim.status).toBe("in_review");
    expect(claimRes.body.fraud.decision).toBe("high");
    expect(claimRes.body.fraud.reasons).toContain("ACCOUNT_TOO_NEW");
    expect(claimRes.body.fraud.reasons).toContain("TRUST_SCORE_CRITICAL");
  });

  it("records review decision trace with notes and supports secondary hold", async () => {
    const adminToken = await loginAdmin();

    // Set up a worker with low trust to land claim in in_review
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9988776655",
      city: "Bengaluru",
      zone: "Bellandur",
      accountAgeDays: 10,
      activeHours14d: 44,
      payoutAccountVerified: true,
      locationConsistency: 0.85,
      trustScore: 370
    });

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({
      workerId: workerRes.body.worker.id,
      plan: "basic"
    });

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "review-trace-event-1",
      requestedAmount: 450
    });
    expect(claimRes.status).toBe(202);
    const claimId = claimRes.body.claim.id;

    // First review: hold for secondary
    const holdRes = await request(app)
      .post(`/api/v1/admin/claims/${claimId}/review`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ holdForSecondary: true, note: "Escalated for secondary review" });
    expect(holdRes.status).toBe(200);
    expect(holdRes.body.decision.action).toBe("hold");
    expect(holdRes.body.decision.secondaryHold).toBe(true);
    expect(holdRes.body.decision.note).toBe("Escalated for secondary review");
    expect(holdRes.body.claim.status).toBe("in_review"); // still in_review

    const traceAfterHold = await request(app)
      .get(`/api/v1/admin/claims/${claimId}/review-trace`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(traceAfterHold.status).toBe(200);
    expect(traceAfterHold.body.decisions.length).toBe(1);
    expect(traceAfterHold.body.decisions[0].action).toBe("hold");

    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Second review: reject with note
    const rejectRes = await request(app)
      .post(`/api/v1/admin/claims/${claimId}/review`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ action: "reject", note: "Confirmed fraudulent activity" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.claim.status).toBe("rejected");
    expect(rejectRes.body.decision.note).toBe("Confirmed fraudulent activity");

    const traceAfterReject = await request(app)
      .get(`/api/v1/admin/claims/${claimId}/review-trace`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(traceAfterReject.status).toBe(200);
    expect(traceAfterReject.body.decisions.length).toBe(2);
    expect(traceAfterReject.body.decisions[1].action).toBe("reject");
  });

  it("enforces fraud threshold governance with role-based access", async () => {
    const adminToken = await loginAdmin(); // risk-admin role

    // GET thresholds works for risk-admin
    const getRes = await request(app)
      .get("/api/v1/admin/fraud-thresholds")
      .set("authorization", `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.thresholds.critical).toBe(80);
    expect(getRes.body.thresholds.high).toBe(55);
    expect(getRes.body.thresholds.medium).toBe(30);

    // PUT thresholds blocked for risk-admin (needs platform-admin)
    const forbiddenPut = await request(app)
      .put("/api/v1/admin/fraud-thresholds")
      .set("authorization", `Bearer ${adminToken}`)
      .send({ critical: 90, high: 60, medium: 35 });
    expect(forbiddenPut.status).toBe(403);

    // Inject a platform-admin session directly
    const platformSession = createSession("platform-ops", "platform-admin", "platform-ops@suraksha.dev");

    await new Promise((resolve) => setTimeout(resolve, 1100)); // let burst window reset

    const allowedPut = await request(app)
      .put("/api/v1/admin/fraud-thresholds")
      .set("authorization", `Bearer ${platformSession.accessToken}`)
      .send({ critical: 90, high: 60, medium: 35 });
    expect(allowedPut.status).toBe(200);
    expect(allowedPut.body.thresholds.critical).toBe(90);
    expect(allowedPut.body.thresholds.high).toBe(60);
    expect(allowedPut.body.thresholds.medium).toBe(35);

    const verifyRes = await request(app)
      .get("/api/v1/admin/fraud-thresholds")
      .set("authorization", `Bearer ${adminToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.thresholds.critical).toBe(90);
  });

  it("supports worker timeline, payout estimator, trigger explanations, and support ticket flow", async () => {
    const otpRequest = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9111111111" });
    expect(otpRequest.status).toBe(200);

    const workerSession = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9111111111", code: "1234" });
    expect(workerSession.status).toBe(200);
    const workerToken = workerSession.body.session.accessToken as string;

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9111111111",
      city: "Bengaluru",
      zone: "HSR",
      accountAgeDays: 120,
      activeHours14d: 80,
      payoutAccountVerified: true,
      locationConsistency: 0.95,
      trustScore: 850
    });
    expect(workerRes.status).toBe(201);

    const workerId = workerRes.body.worker.id;
    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "standard" });
    expect(purchaseRes.status).toBe(201);

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "phase8-worker-timeline-event",
      requestedAmount: 650
    });
    expect([201, 202]).toContain(claimRes.status);

    const ticketRes = await request(app)
      .post(`/api/v1/workers/${workerId}/support/tickets`)
      .set("authorization", `Bearer ${workerToken}`)
      .send({ issueType: "payout", priority: "high", details: "Payout pending for too long" });
    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body.ticket.status).toBe("open");

    const timelineRes = await request(app).get(`/api/v1/workers/${workerId}/timeline`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.timeline.some((entry: { category: string }) => entry.category === "policy")).toBe(true);
    expect(timelineRes.body.timeline.some((entry: { category: string }) => entry.category === "support")).toBe(true);

    const estimatorRes = await request(app).post(`/api/v1/workers/${workerId}/payout-estimator`).send({
      policyId: purchaseRes.body.policy.id,
      triggerType: "heavy_rain",
      lostCoveredHours: 6,
      triggerSeverityFactor: 1.2
    });
    expect(estimatorRes.status).toBe(200);
    expect(estimatorRes.body.estimate.estimatedPayout).toBeGreaterThanOrEqual(0);
    expect(estimatorRes.body.estimate.weeklyCoverageCap).toBeGreaterThan(0);
    expect(estimatorRes.body.explanation.formula).toContain("min(coverage_cap");

    const triggerExplainRes = await request(app).get("/api/v1/content/trigger-explanations");
    expect(triggerExplainRes.status).toBe(200);
    expect(triggerExplainRes.body.triggers.some((trigger: { type: string }) => trigger.type === "heavy_rain")).toBe(true);

    const workerTickets = await request(app)
      .get(`/api/v1/workers/${workerId}/support/tickets`)
      .set("authorization", `Bearer ${workerToken}`);
    expect(workerTickets.status).toBe(200);
    expect(workerTickets.body.tickets.length).toBe(1);
  });

  it("exposes admin portfolio, fraud, operations, and support queue views", async () => {
    const adminToken = await loginAdmin();

    const otpRequest = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9222222222" });
    expect(otpRequest.status).toBe(200);

    const workerSession = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9222222222", code: "1234" });
    expect(workerSession.status).toBe(200);
    const workerToken = workerSession.body.session.accessToken as string;

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9222222222",
      city: "Bengaluru",
      zone: "Whitefield",
      accountAgeDays: 25,
      activeHours14d: 40,
      payoutAccountVerified: true,
      locationConsistency: 0.8,
      trustScore: 360
    });
    expect(workerRes.status).toBe(201);
    const workerId = workerRes.body.worker.id;

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "basic" });
    expect(purchaseRes.status).toBe(201);

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "phase8-admin-overview-event",
      requestedAmount: 300
    });
    expect([201, 202]).toContain(claimRes.status);

    const ticketRes = await request(app)
      .post(`/api/v1/workers/${workerId}/support/tickets`)
      .set("authorization", `Bearer ${workerToken}`)
      .send({ issueType: "claim", priority: "medium", details: "Need claim status clarification" });
    expect(ticketRes.status).toBe(201);

    const portfolio = await request(app)
      .get("/api/v1/admin/portfolio/summary")
      .set("authorization", `Bearer ${adminToken}`);
    expect(portfolio.status).toBe(200);
    expect(portfolio.body.summary.policies).toBeGreaterThan(0);

    const fraud = await request(app)
      .get("/api/v1/admin/fraud/overview")
      .set("authorization", `Bearer ${adminToken}`);
    expect(fraud.status).toBe(200);
    expect(fraud.body.claims.total).toBeGreaterThan(0);
    expect(fraud.body.thresholds.critical).toBeGreaterThan(0);

    const operations = await request(app)
      .get("/api/v1/admin/operations/overview")
      .set("authorization", `Bearer ${adminToken}`);
    expect(operations.status).toBe(200);
    expect(operations.body.jobs.total).toBeGreaterThanOrEqual(0);
    expect(operations.body.support.open).toBeGreaterThan(0);

    const supportQueue = await request(app)
      .get("/api/v1/admin/support/tickets")
      .set("authorization", `Bearer ${adminToken}`);
    expect(supportQueue.status).toBe(200);
    expect(supportQueue.body.total).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const updateTicket = await request(app)
      .patch(`/api/v1/admin/support/tickets/${ticketRes.body.ticket.id}`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ status: "resolved", resolutionNote: "Explained payout timeline and closed ticket." });
    expect(updateTicket.status).toBe(200);
    expect(updateTicket.body.ticket.status).toBe("resolved");
  });

  it("handles uncertain payout state and admin resolution", async () => {
    const adminToken = await loginAdmin();

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "2200220022",
      city: "Bengaluru",
      zone: "Koramangala",
      accountAgeDays: 90,
      activeHours14d: 60,
      payoutAccountVerified: true,
      locationConsistency: 0.92,
      trustScore: 800
    });
    const workerId = workerRes.body.worker.id;

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "basic" });
    expect(purchaseRes.status).toBe(201);

    // Switch adapter to pending mode before claim
    setPayoutAdapterMode("pending");

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "uncertain-event-1",
      requestedAmount: 600
    });
    expect(claimRes.status).toBe(202);
    expect(claimRes.body.payout.status).toBe("pending");
    expect(claimRes.body.claim.status).toBe("approved");
    expect(claimRes.body.explanation.decision).toBe("approved_payout_pending");

    const payoutId = claimRes.body.payout.id;
    const claimId = claimRes.body.claim.id;

    // Verify ledger entry shows pending
    const ledgerRes = await request(app)
      .get(`/api/v1/admin/ledger?claimId=${claimId}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.entries.length).toBe(1);
    expect(ledgerRes.body.entries[0].status).toBe("pending");

    // Admin lists pending payouts
    const pendingPayouts = await request(app)
      .get("/api/v1/admin/payouts?status=pending")
      .set("authorization", `Bearer ${adminToken}`);
    expect(pendingPayouts.status).toBe(200);
    expect(pendingPayouts.body.payouts.some((p: { id: string }) => p.id === payoutId)).toBe(true);

    resetPayoutAdapterMode();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Admin resolves uncertain payout as success
    const resolveRes = await request(app)
      .post(`/api/v1/admin/payouts/${payoutId}/resolve`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ outcome: "success" });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.payout.status).toBe("success");
    expect(resolveRes.body.claim.status).toBe("paid");

    // Ledger entry should now be settled
    const ledgerAfter = await request(app)
      .get(`/api/v1/admin/ledger?claimId=${claimId}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(ledgerAfter.body.entries[0].status).toBe("settled");
  });

  it("handles failed payout and retry flow with ledger integrity", async () => {
    const adminToken = await loginAdmin();

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "3300330033",
      city: "Bengaluru",
      zone: "Whitefield",
      accountAgeDays: 100,
      activeHours14d: 65,
      payoutAccountVerified: true,
      locationConsistency: 0.95,
      trustScore: 820
    });
    const workerId = workerRes.body.worker.id;

    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "basic" });
    expect(purchaseRes.status).toBe(201);

    setPayoutAdapterMode("fail");

    const claimRes = await request(app).post("/api/v1/claims/initiate").send({
      workerId,
      policyId: purchaseRes.body.policy.id,
      triggerEventId: "fail-event-1",
      requestedAmount: 500
    });
    expect(claimRes.status).toBe(202);
    expect(claimRes.body.payout.status).toBe("failed");
    expect(claimRes.body.claim.status).toBe("approved");
    expect(claimRes.body.explanation.decision).toBe("approved_payout_failed");

    const payoutId = claimRes.body.payout.id;
    const claimId = claimRes.body.claim.id;

    resetPayoutAdapterMode();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Retry the failed payout
    const retryRes = await request(app)
      .post(`/api/v1/admin/payouts/${payoutId}/retry`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.payout.status).toBe("success");
    expect(retryRes.body.payout.retryCount).toBe(1);
    expect(retryRes.body.claim.status).toBe("paid");

    // Verify ledger shows settled after retry
    const ledgerRes = await request(app)
      .get(`/api/v1/admin/ledger?claimId=${claimId}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(ledgerRes.body.entries[0].status).toBe("settled");
  });

  it("reconciliation detects unresolved pending payouts and claim-payout mismatches", async () => {
    const adminToken = await loginAdmin();

    // Register worker and purchase policy
    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "4400440044",
      city: "Bengaluru",
      zone: "Banashankari",
      accountAgeDays: 80,
      activeHours14d: 60,
      payoutAccountVerified: true,
      locationConsistency: 0.9,
      trustScore: 770
    });
    const workerId = workerRes.body.worker.id;
    const purchaseRes = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "basic" });
    const policyId = purchaseRes.body.policy.id;

    const now = Date.now();

    // Seed a paid claim with NO corresponding payout
    const mismatchClaim = repository.createClaim({
      id: "mismatch-claim-1",
      workerId,
      policyId,
      triggerEventId: "mismatch-trigger-1",
      triggerType: "manual",
      status: "paid",
      riskScore: 10,
      payoutAmount: 300,
      decisionReasons: ["SEED"],
      createdAt: new Date(now - 10 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 10 * 60 * 1000).toISOString(),
      paidAt: new Date(now - 10 * 60 * 1000).toISOString()
    });

    // Seed a stale pending payout (older than 5 min threshold)
    repository.createPayout({
      id: "stale-payout-1",
      claimId: mismatchClaim.id,
      workerId,
      idempotencyKey: "stale-key-1",
      amount: 200,
      status: "pending",
      adapter: "mock",
      retryCount: 0,
      createdAt: new Date(now - 10 * 60 * 1000).toISOString()
    });

    const runRes = await request(app)
      .post("/api/v1/admin/reconciliation/run")
      .set("authorization", `Bearer ${adminToken}`);
    expect(runRes.status).toBe(200);
    expect(runRes.body.report.unresolvedPendingCount).toBeGreaterThan(0);
    expect(runRes.body.report.claimPayoutMismatches).toBeGreaterThan(0);
    expect(runRes.body.report.pendingPayouts).toBeGreaterThan(0);
    expect(runRes.body.job).toBeDefined();
    expect(runRes.body.job.type).toBe("reconciliation");
  });

  it("returns governance traceability, release readiness, and external dependency readiness packs", async () => {
    const adminToken = await loginAdmin();

    const traceability = await request(app)
      .get("/api/v1/admin/governance/traceability")
      .set("authorization", `Bearer ${adminToken}`);
    expect(traceability.status).toBe(200);
    expect(traceability.body.totals.mappedRequirements).toBeGreaterThan(0);
    expect(Array.isArray(traceability.body.items)).toBe(true);
    expect(traceability.body.items[0].requirementId).toBeDefined();

    const releaseReadiness = await request(app)
      .get("/api/v1/admin/governance/release-readiness")
      .set("authorization", `Bearer ${adminToken}`);
    expect(releaseReadiness.status).toBe(200);
    expect(Array.isArray(releaseReadiness.body.gates)).toBe(true);
    expect(releaseReadiness.body.releaseDecision).toMatch(/ready_for_release|conditional_hold/);

    const externalReadiness = await request(app)
      .get("/api/v1/admin/governance/external-readiness")
      .set("authorization", `Bearer ${adminToken}`);
    expect(externalReadiness.status).toBe(200);
    expect(externalReadiness.body.totals.total).toBeGreaterThan(0);
    expect(Array.isArray(externalReadiness.body.knownGaps)).toBe(true);
  });

  it("enforces governance endpoints as admin-only", async () => {
    await request(app).post("/api/v1/auth/otp/request").send({ phone: "9777777777" });
    const workerSession = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9777777777", code: "1234" });
    expect(workerSession.status).toBe(200);
    const workerToken = workerSession.body.session.accessToken as string;

    const forbidden = await request(app)
      .get("/api/v1/admin/governance/traceability")
      .set("authorization", `Bearer ${workerToken}`);
    expect(forbidden.status).toBe(403);
  });
});
