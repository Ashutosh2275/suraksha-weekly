import { Worker } from "../types.js";

export function trustTier(score: number): "bronze" | "silver" | "gold" {
  if (score >= 850) return "gold";
  if (score >= 700) return "silver";
  return "bronze";
}

export function trustAdjustment(worker: Worker): number {
  const tier = trustTier(worker.trustScore);
  if (tier === "gold") return 0.9;
  if (tier === "silver") return 0.97;
  return 1;
}
