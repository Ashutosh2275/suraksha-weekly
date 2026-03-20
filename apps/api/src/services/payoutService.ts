import { v4 as uuid } from "uuid";
import { repository } from "../data/repository.js";
import { LedgerEntry, PayoutTransaction } from "../types.js";

export type PayoutAdapterMode = "success" | "pending" | "fail";

let adapterMode: PayoutAdapterMode = "success";

export function setPayoutAdapterMode(mode: PayoutAdapterMode): void {
  adapterMode = mode;
}

export function resetPayoutAdapterMode(): void {
  adapterMode = "success";
}

function callAdapter(): "success" | "pending" | "failed" {
  if (adapterMode === "pending") return "pending";
  if (adapterMode === "fail") return "failed";
  return "success";
}

export function idempotencyKey(workerId: string, policyId: string, triggerEventId: string): string {
  return `${workerId}:${policyId}:${triggerEventId}`;
}

export function processPayout(claimId: string, workerId: string, key: string, amount: number): PayoutTransaction {
  // Idempotency: return existing payout for same key
  const existing = repository.findPayoutByIdempotencyKey(key);
  if (existing) {
    return existing;
  }

  const payoutId = uuid();
  const now = new Date().toISOString();

  // Ledger-first: create a pending ledger entry before touching payment rails
  const ledgerEntry: LedgerEntry = {
    id: uuid(),
    claimId,
    workerId,
    payoutId,
    amount,
    idempotencyKey: key,
    status: "pending",
    createdAt: now
  };
  repository.createLedgerEntry(ledgerEntry);

  const payout: PayoutTransaction = {
    id: payoutId,
    claimId,
    workerId,
    idempotencyKey: key,
    amount,
    status: "pending",
    adapter: "mock",
    retryCount: 0,
    createdAt: now
  };
  repository.createPayout(payout);

  // Call adapter
  const outcome = callAdapter();
  payout.status = outcome;
  if (outcome !== "pending") {
    payout.resolvedAt = new Date().toISOString();
  }
  if (outcome === "failed") {
    payout.failureReason = "ADAPTER_DECLINED";
  }

  repository.updatePayout(payout);

  // Settle or fail ledger entry
  ledgerEntry.status = outcome === "success" ? "settled" : outcome === "failed" ? "failed" : "pending";
  if (outcome !== "pending") {
    ledgerEntry.settledAt = payout.resolvedAt;
  }
  repository.updateLedgerEntry(ledgerEntry);

  return payout;
}

export function retryPayout(payoutId: string): PayoutTransaction | undefined {
  const payout = repository.getPayout(payoutId);
  if (!payout) return undefined;
  if (payout.status !== "failed") return payout;

  payout.retryCount += 1;
  const outcome = callAdapter();
  payout.status = outcome;
  if (outcome !== "pending") {
    payout.resolvedAt = new Date().toISOString();
  }
  payout.failureReason = outcome === "failed" ? "ADAPTER_DECLINED_ON_RETRY" : undefined;
  repository.updatePayout(payout);

  const ledger = repository.findLedgerEntryByPayoutId(payoutId);
  if (ledger) {
    ledger.status = outcome === "success" ? "settled" : outcome === "failed" ? "failed" : "pending";
    if (outcome !== "pending") ledger.settledAt = payout.resolvedAt;
    repository.updateLedgerEntry(ledger);
  }

  return payout;
}

export function resolveUncertainPayout(payoutId: string, outcome: "success" | "failed"): PayoutTransaction | undefined {
  const payout = repository.getPayout(payoutId);
  if (!payout) return undefined;
  if (payout.status !== "pending") return payout;

  payout.status = outcome;
  payout.resolvedAt = new Date().toISOString();
  if (outcome === "failed") {
    payout.failureReason = "ADMIN_RESOLVED_FAILED";
  }
  repository.updatePayout(payout);

  const ledger = repository.findLedgerEntryByPayoutId(payoutId);
  if (ledger) {
    ledger.status = outcome === "success" ? "settled" : "failed";
    ledger.settledAt = payout.resolvedAt;
    repository.updateLedgerEntry(ledger);
  }

  return payout;
}

