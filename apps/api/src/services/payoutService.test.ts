import { beforeEach, describe, expect, it } from "vitest";
import { store } from "../data/store.js";
import { processPayout, resetPayoutAdapterMode } from "./payoutService.js";
import { runReconciliation } from "./reconciliationService.js";

describe("payoutService", () => {
  beforeEach(() => {
    store.payouts.clear();
    store.idempotencyKeys.clear();
    store.ledgerEntries.clear();
    resetPayoutAdapterMode();
  });

  it("returns the same payout for repeated idempotency key", () => {
    const first = processPayout("c1", "w1", "same-key", 1200);
    const second = processPayout("c1", "w1", "same-key", 1200);
    expect(first.id).toBe(second.id);
  });

  it("reconciliation reports zero duplicates for idempotent payouts", () => {
    processPayout("c1", "w1", "same-key", 1200);
    processPayout("c1", "w1", "same-key", 1200);
    const report = runReconciliation();
    expect(report.duplicatesDetected).toBe(0);
    expect(report.successPayouts).toBe(1);
  });
});
