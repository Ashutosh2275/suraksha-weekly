import { Claim, Policy, PayoutTransaction, RiskProfile, Worker } from "../types.js";

const requiredProfileFields: Array<keyof RiskProfile> = [
  "fullName",
  "dob",
  "emergencyContact",
  "aadhaar4",
  "pan4",
  "riderId",
  "platformType",
  "city",
  "zone",
  "ordersPerDay",
  "averageDailyOnlineHours",
  "activeHoursWeek",
  "weeklyIncome4w",
  "nominee",
  "upiId",
  "accountAgeDays",
  "locationConsistency",
  "trustScore",
  "payoutAccountVerified",
  "kycVerified",
  "consentAccepted",
  "triggerDisclosureAccepted"
];

export function calculateProfileCompleteness(profile: RiskProfile | undefined) {
  if (!profile) {
    return {
      completed: 0,
      total: requiredProfileFields.length,
      percentage: 0,
      missing: requiredProfileFields.map(String)
    };
  }

  const completed = requiredProfileFields.filter((field) => {
    const value = profile[field];
    if (typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim() !== "" && String(value) !== "0";
  });

  return {
    completed: completed.length,
    total: requiredProfileFields.length,
    percentage: Math.round((completed.length / requiredProfileFields.length) * 100),
    missing: requiredProfileFields.filter((field) => !completed.includes(field)).map(String)
  };
}

export function buildProtectionSummary(
  worker: Worker,
  riskProfile: RiskProfile | undefined,
  policies: Policy[],
  claims: Claim[],
  payouts: PayoutTransaction[]
) {
  const activePolicy = policies.find((policy) => policy.status === "active") || policies[0];
  const activeHoursWeek = riskProfile?.activeHoursWeek || Math.max(1, Math.round(worker.activeHours14d / 2));
  const weeklyIncome = riskProfile?.weeklyIncome4w || riskProfile?.averageWeeklyEarnings || 0;
  const coveredHours = Math.min(activeHoursWeek, 12);
  const baselineHourlyEarnings = activeHoursWeek > 0 ? Math.round(weeklyIncome / activeHoursWeek) : 0;
  const estimatedProtectedEarnings = activePolicy
    ? Math.min(activePolicy.weeklyCoverageCap, baselineHourlyEarnings * coveredHours)
    : baselineHourlyEarnings * coveredHours;

  return {
    coveredHours,
    baselineHourlyEarnings,
    estimatedProtectedEarnings,
    activePolicyCount: policies.filter((policy) => policy.status === "active").length,
    claimCount: claims.length,
    payoutCount: payouts.length,
    latestPolicyStatus: activePolicy?.status || "none"
  };
}

export function coverageTerms() {
  return {
    transparentTerms: [
      "Coverage applies only to loss of income from external disruption events.",
      "Weekly premium pricing and weekly coverage caps apply to every active policy.",
      "High-risk triggers may be subject to waiting periods and fraud review."
    ],
    exclusions: [
      "No health or hospitalization claims.",
      "No life, accident, or vehicle repair cover.",
      "No annual or long-duration policy coverage in MVP."
    ],
    triggers: ["heavy_rain", "extreme_heat", "severe_pollution", "local_restriction", "platform_outage"],
    glossary: {
      covered_hours: "Hours within the insured work pattern that overlap a valid disruption event.",
      baseline_hourly_earnings: "Weekly earnings divided by expected active hours.",
      waiting_period: "A cooling-off window applied before selected high-risk triggers can pay out.",
      trigger_confidence: "Confidence score used to suppress noisy or low-quality disruption signals."
    }
  };
}