import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { repository, resetRepository } from "../data/repository.js";
import { resetStore } from "../data/store.js";
import { resetRateLimiterState } from "../middleware/rateLimit.js";

describe("API red-team scenarios", () => {
  const app = createApp();

  beforeEach(() => {
    resetStore();
    resetRepository();
    resetRateLimiterState();
  });

  it("rejects trigger ingestion without valid internal service key", async () => {
    const noHeader = await request(app).post("/api/v1/triggers/ingest").send({ type: "rain", zone: "HSR" });
    expect(noHeader.status).toBe(401);

    const badHeader = await request(app)
      .post("/api/v1/triggers/ingest")
      .set("x-internal-service", "wrong-key")
      .send({ type: "rain", zone: "HSR" });
    expect(badHeader.status).toBe(401);
  });

  it("blocks worker token from admin-only routes", async () => {
    await request(app).post("/api/v1/auth/otp/request").send({ phone: "9444444444" });
    const worker = await request(app).post("/api/v1/auth/otp/verify").send({ phone: "9444444444", code: "1234" });

    const response = await request(app)
      .get("/api/v1/admin/overview")
      .set("authorization", `Bearer ${worker.body.session.accessToken}`);

    expect(response.status).toBe(403);
  });

  it("invalidates refresh token after logout to prevent replay", async () => {
    const login = await request(app).post("/api/v1/auth/admin/login").send({
      email: "ops@suraksha.dev",
      password: "Admin@123"
    });
    expect(login.status).toBe(200);

    const accessToken = login.body.session.accessToken as string;
    const refreshToken = login.body.session.refreshToken as string;

    const logout = await request(app).post("/api/v1/auth/logout").set("authorization", `Bearer ${accessToken}`);
    expect(logout.status).toBe(200);

    const replay = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(replay.status).toBe(401);
  });

  it("contains brute-force OTP attempts with retry-after hint", async () => {
    let finalAttempt;
    for (let i = 0; i < 6; i += 1) {
      finalAttempt = await request(app).post("/api/v1/auth/otp/request").send({ phone: "9555555555" });
    }

    expect(finalAttempt?.status).toBe(429);
    expect(finalAttempt?.headers["retry-after"]).toBeDefined();
  });

  it("prevents duplicate payout creation on repeated manual approval", async () => {
    const adminLogin = await request(app).post("/api/v1/auth/admin/login").send({
      email: "ops@suraksha.dev",
      password: "Admin@123"
    });
    const adminToken = adminLogin.body.session.accessToken as string;

    const workerRes = await request(app).post("/api/v1/workers/register").send({
      phone: "9666666666",
      city: "Bengaluru",
      zone: "HSR",
      accountAgeDays: 5,
      activeHours14d: 50,
      payoutAccountVerified: true,
      locationConsistency: 0.88,
      trustScore: 330
    });

    const purchase = await request(app).post("/api/v1/policies/purchase").send({ workerId: workerRes.body.worker.id, plan: "basic" });

    const claim = await request(app).post("/api/v1/claims/initiate").send({
      workerId: workerRes.body.worker.id,
      policyId: purchase.body.policy.id,
      triggerEventId: "red-team-dup-approval",
      requestedAmount: 300
    });

    expect(claim.status).toBe(202);
    expect(claim.body.claim.status).toBe("in_review");

    const claimId = claim.body.claim.id as string;

    const approveOnce = await request(app)
      .post(`/api/v1/admin/claims/${claimId}/review`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ action: "approve" });

    expect([200, 202]).toContain(approveOnce.status);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const approveTwice = await request(app)
      .post(`/api/v1/admin/claims/${claimId}/review`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({ action: "approve" });

    expect([200, 202]).toContain(approveTwice.status);

    const payout = repository.findPayoutByClaim(claimId);
    expect(payout).toBeDefined();

    const payoutsByClaim = repository.listPayouts().filter((entry) => entry.claimId === claimId);
    expect(payoutsByClaim.length).toBe(1);
  });
});
