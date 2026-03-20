import { Worker } from "../types.js";
import { deriveRiskSegment } from "./underwritingService.js";
import { trustAdjustment } from "./trustService.js";

const PREMIUM_FLOOR = 20;
const PREMIUM_CEILING = 150;

export interface PremiumBreakdown {
  base: number;
  riskMultiplier: number;
  exposureMultiplier: number;
  trustFactor: number;
  rawPremium: number;
  guardrailFloor: number;
  guardrailCeiling: number;
  finalPremium: number;
}

export function calculatePremiumBreakdown(worker: Worker, plan: "basic" | "standard" | "pro"): PremiumBreakdown {
  const base = plan === "basic" ? 35 : plan === "standard" ? 50 : 70;
  const segment = deriveRiskSegment(worker);
  const riskMultiplier = segment === "low" ? 1 : segment === "medium" ? 1.25 : 1.55;
  const exposureMultiplier = worker.activeHours14d >= 70 ? 1.2 : worker.activeHours14d >= 50 ? 1.05 : 1;
  const trustFactor = trustAdjustment(worker);
  const rawPremium = base * riskMultiplier * exposureMultiplier * trustFactor;
  const rounded = Math.round(rawPremium);
  const finalPremium = Math.min(PREMIUM_CEILING, Math.max(PREMIUM_FLOOR, rounded));

  return {
    base,
    riskMultiplier,
    exposureMultiplier,
    trustFactor,
    rawPremium: Math.round(rawPremium * 100) / 100,
    guardrailFloor: PREMIUM_FLOOR,
    guardrailCeiling: PREMIUM_CEILING,
    finalPremium
  };
}

export function calculateWeeklyPremium(worker: Worker, plan: "basic" | "standard" | "pro"): number {
  return calculatePremiumBreakdown(worker, plan).finalPremium;
}

export function premiumGuardrails() {
  return {
    floor: PREMIUM_FLOOR,
    ceiling: PREMIUM_CEILING
  };
}
