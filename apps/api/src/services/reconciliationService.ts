import { repository } from "../data/repository.js";

export interface ReconciliationReport {
  generatedAt: string;
  totalPayouts: number;
  successPayouts: number;
  failedPayouts: number;
  pendingPayouts: number;
  duplicatesDetected: number;
  unresolvedPendingCount: number;
  claimPayoutMismatches: number;
  ledgerEntries: number;
  ledgerSettled: number;
  ledgerFailed: number;
  ledgerPending: number;
}

export function runReconciliation(): ReconciliationReport {
  const payouts = repository.listPayouts();
  const keyCounts = new Map<string, number>();

  for (const payout of payouts) {
    keyCounts.set(payout.idempotencyKey, (keyCounts.get(payout.idempotencyKey) || 0) + 1);
  }

  const duplicatesDetected = [...keyCounts.values()].filter((count) => count > 1).length;

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  // Unresolved: pending payouts older than 5 minutes
  const staleCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const unresolvedPendingCount = pendingPayouts.filter((p) => p.createdAt < staleCutoff).length;

  // Paid claims with no corresponding success payout
  const paidClaims = repository.listClaimsByStatus("paid");
  const successClaimIds = new Set(payouts.filter((p) => p.status === "success").map((p) => p.claimId));
  const claimPayoutMismatches = paidClaims.filter((c) => !successClaimIds.has(c.id)).length;

  const ledger = repository.listLedgerEntries();

  return {
    generatedAt: new Date().toISOString(),
    totalPayouts: payouts.length,
    successPayouts: payouts.filter((p) => p.status === "success").length,
    failedPayouts: payouts.filter((p) => p.status === "failed").length,
    pendingPayouts: pendingPayouts.length,
    duplicatesDetected,
    unresolvedPendingCount,
    claimPayoutMismatches,
    ledgerEntries: ledger.length,
    ledgerSettled: ledger.filter((e) => e.status === "settled").length,
    ledgerFailed: ledger.filter((e) => e.status === "failed").length,
    ledgerPending: ledger.filter((e) => e.status === "pending").length
  };
}

