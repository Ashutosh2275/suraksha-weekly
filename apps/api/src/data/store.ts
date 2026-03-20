import { Claim, ClaimEvent, LedgerEntry, Policy, PolicyReminder, PayoutTransaction, RetentionEvent, ReviewDecision, RiskProfile, SessionRecord, SupportTicket, TriggerEvent, Worker } from "../types.js";

export const store = {
  workers: new Map<string, Worker>(),
  riskProfiles: new Map<string, RiskProfile>(),
  policies: new Map<string, Policy>(),
  policyReminders: new Map<string, PolicyReminder>(),
  retentionEvents: new Map<string, RetentionEvent>(),
  claims: new Map<string, Claim>(),
  claimEvents: new Map<string, ClaimEvent[]>(),
  reviewDecisions: new Map<string, ReviewDecision[]>(),
  supportTickets: new Map<string, SupportTicket>(),
  payouts: new Map<string, PayoutTransaction>(),
  ledgerEntries: new Map<string, LedgerEntry>(),
  triggers: new Map<string, TriggerEvent>(),
  otpChallenges: new Map<string, { code: string; expiresAt: number }>(),
  sessionsByAccessToken: new Map<string, SessionRecord>(),
  sessionsByRefreshToken: new Map<string, SessionRecord>(),
  idempotencyKeys: new Set<string>(),
  fraudThresholds: { critical: 80, high: 55, medium: 30 } as { critical: number; high: number; medium: number }
};

export function resetStore() {
  store.workers.clear();
  store.riskProfiles.clear();
  store.policies.clear();
  store.policyReminders.clear();
  store.retentionEvents.clear();
  store.claims.clear();
  store.claimEvents.clear();
  store.reviewDecisions.clear();
  store.supportTickets.clear();
  store.payouts.clear();
  store.ledgerEntries.clear();
  store.triggers.clear();
  store.otpChallenges.clear();
  store.sessionsByAccessToken.clear();
  store.sessionsByRefreshToken.clear();
  store.idempotencyKeys.clear();
  store.fraudThresholds = { critical: 80, high: 55, medium: 30 };
}
