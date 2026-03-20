import { describe, expect, it } from "vitest";
import { coverageCapBySegment, deriveRiskSegment, evaluateEligibility } from "./underwritingService.js";

describe("underwritingService", () => {
  const worker = {
    id: "w1",
    phone: "9999999999",
    city: "Bengaluru",
    zone: "Koramangala",
    accountAgeDays: 45,
    activeHours14d: 50,
    payoutAccountVerified: true,
    locationConsistency: 0.84,
    trustScore: 730
  };

  it("marks eligible worker correctly", () => {
    expect(evaluateEligibility(worker).eligible).toBe(true);
  });

  it("derives medium risk segment", () => {
    expect(deriveRiskSegment(worker)).toBe("medium");
  });

  it("computes larger cap for pro plan", () => {
    expect(coverageCapBySegment("medium", "pro")).toBeGreaterThan(coverageCapBySegment("medium", "basic"));
  });
});
