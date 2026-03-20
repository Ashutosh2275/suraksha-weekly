import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetRepository } from "../data/repository.js";
import { resetStore } from "../data/store.js";
import { resetRateLimiterState } from "../middleware/rateLimit.js";
import { resetJobs } from "../services/queueService.js";
import { resetPayoutAdapterMode, setPayoutAdapterMode } from "../services/payoutService.js";

describe("API end-to-end journeys", () => {
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

  it("completes worker-to-admin payout resolution journey", async () => {
    const adminToken = await loginAdmin();

    const otpRequest = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9333333333" });
    expect(otpRequest.status).toBe(200);

    const otpVerify = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9333333333", code: "1234" });
    expect(otpVerify.status).toBe(200);
    const workerToken = otpVerify.body.session.accessToken as string;

    const onboarding = await request(app)
      .post("/api/v1/workers/onboarding")
      .set("authorization", `Bearer ${workerToken}`)
      .send({
        phone: "9333333333",
        city: "Bengaluru",
        zone: "Koramangala",
        serviceZones: ["Koramangala", "HSR"],
        fullName: "Phase Nine Worker",
        dob: "1995-03-01",
        gender: "female",
        emergencyContact: "9888888888",
        aadhaar4: "1111",
        pan4: "2222",
        riderId: "RID-900",
        platformType: "swiggy",
        vehicleType: "bike",
        ordersPerDay: 20,
        averageDailyOnlineHours: 8,
        activeHoursWeek: 48,
        activeHours14d: 96,
        weeklyIncome4w: 7200,
        averageWeeklyEarnings: 7200,
        volatilityBand: "medium",
        payoutCycle: "weekly",
        cashShare: 10,
        digitalShare: 90,
        nominee: "Nominee A",
        upiId: "phase9@upi",
        bank4: "1234",
        accountAgeDays: 120,
        locationConsistency: 0.94,
        trustScore: 860,
        payoutAccountVerified: true,
        kycVerified: true,
        consentAccepted: true,
        triggerDisclosureAccepted: true
      });

    expect(onboarding.status).toBe(201);
    const workerId = onboarding.body.worker.id as string;

    const quote = await request(app).post("/api/v1/policies/quote").send({ workerId, plan: "pro" });
    expect(quote.status).toBe(200);

    const purchase = await request(app).post("/api/v1/policies/purchase").send({ workerId, plan: "pro" });
    expect(purchase.status).toBe(201);

    setPayoutAdapterMode("pending");

    const claim = await request(app).post("/api/v1/claims/initiate").send({
      workerId,
      policyId: purchase.body.policy.id,
      triggerEventId: "phase9-e2e-trigger",
      requestedAmount: 1200
    });

    expect(claim.status).toBe(202);
    expect(claim.body.payout.status).toBe("pending");

    const payoutId = claim.body.payout.id as string;

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const resolve = await request(app)
      .post(`/api/v1/admin/payouts/${payoutId}/resolve`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ outcome: "success" });

    expect(resolve.status).toBe(200);
    expect(resolve.body.payout.status).toBe("success");
    expect(resolve.body.claim.status).toBe("paid");

    const timeline = await request(app).get(`/api/v1/workers/${workerId}/timeline`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.timeline.length).toBeGreaterThan(0);

    const operations = await request(app)
      .get("/api/v1/admin/operations/overview")
      .set("authorization", `Bearer ${adminToken}`);
    expect(operations.status).toBe(200);
  });
});
