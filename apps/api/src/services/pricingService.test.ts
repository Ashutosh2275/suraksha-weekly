import { describe, expect, it } from "vitest";
import { calculateWeeklyPremium } from "./pricingService.js";

describe("pricingService", () => {
  it("returns a numeric premium floor", () => {
    const premium = calculateWeeklyPremium(
      {
        id: "w1",
        phone: "9999999999",
        city: "Bengaluru",
        zone: "Koramangala",
        accountAgeDays: 90,
        activeHours14d: 60,
        payoutAccountVerified: true,
        locationConsistency: 0.9,
        trustScore: 820
      },
      "standard"
    );
    expect(premium).toBeGreaterThanOrEqual(20);
  });
});
