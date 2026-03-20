import { describe, expect, it } from "vitest";
import { scoreFraud } from "./fraudService.js";

describe("fraudService", () => {
  it("flags unverified payout account as critical", () => {
    const result = scoreFraud(
      {
        id: "w1",
        phone: "999",
        city: "Delhi",
        zone: "Central",
        accountAgeDays: 90,
        activeHours14d: 70,
        payoutAccountVerified: false,
        locationConsistency: 0.5,
        trustScore: 650
      },
      { triggerEventId: "t1", payoutAmount: 2500 }
    );
    expect(result.decision).toBe("critical");
    expect(result.reasons).toContain("PAYOUT_ACCOUNT_UNVERIFIED");
  });
});
