import { v4 as uuid } from "uuid";
import { store } from "./store.js";
import { Claim, ClaimEvent, LedgerEntry, Policy, PolicyReminder, PayoutTransaction, RetentionEvent, ReviewDecision, RiskProfile, SessionRecord, SupportTicket, TriggerEvent, Worker } from "../types.js";

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const auditLogs = new Map<string, AuditRecord>();

export const repository = {
  createWorker(worker: Worker): Worker {
    store.workers.set(worker.id, worker);
    this.audit("worker", worker.id, "created", worker);
    return worker;
  },

  getWorker(id: string): Worker | undefined {
    return store.workers.get(id);
  },

  findWorkerByPhone(phone: string): Worker | undefined {
    return [...store.workers.values()].find((worker) => worker.phone === phone);
  },

  updateWorker(worker: Worker): Worker {
    store.workers.set(worker.id, worker);
    this.audit("worker", worker.id, "updated", worker);
    return worker;
  },

  createPolicy(policy: Policy): Policy {
    store.policies.set(policy.id, policy);
    this.audit("policy", policy.id, "created", policy);
    return policy;
  },

  getPolicy(id: string): Policy | undefined {
    return store.policies.get(id);
  },

  updatePolicy(policy: Policy): Policy {
    store.policies.set(policy.id, policy);
    this.audit("policy", policy.id, "updated", policy);
    return policy;
  },

  createClaim(claim: Claim): Claim {
    store.claims.set(claim.id, claim);
    this.audit("claim", claim.id, "created", claim);
    return claim;
  },

  updateClaim(claim: Claim): Claim {
    store.claims.set(claim.id, claim);
    this.audit("claim", claim.id, "updated", claim);
    return claim;
  },

  getClaim(id: string): Claim | undefined {
    return store.claims.get(id);
  },

  findClaim(workerId: string, policyId: string, triggerEventId: string): Claim | undefined {
    return [...store.claims.values()].find(
      (claim) => claim.workerId === workerId && claim.policyId === policyId && claim.triggerEventId === triggerEventId
    );
  },

  listClaimsByStatus(status: Claim["status"]): Claim[] {
    return [...store.claims.values()].filter((claim) => claim.status === status);
  },

  listWorkerClaims(workerId: string): Claim[] {
    return [...store.claims.values()].filter((claim) => claim.workerId === workerId);
  },

  appendClaimEvent(event: ClaimEvent): ClaimEvent {
    const existing = store.claimEvents.get(event.claimId) || [];
    store.claimEvents.set(event.claimId, [...existing, event]);
    this.audit("claim_event", event.claimId, "appended", event);
    return event;
  },

  listClaimEvents(claimId: string): ClaimEvent[] {
    return [...(store.claimEvents.get(claimId) || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  appendReviewDecision(decision: ReviewDecision): ReviewDecision {
    const existing = store.reviewDecisions.get(decision.claimId) || [];
    store.reviewDecisions.set(decision.claimId, [...existing, decision]);
    this.audit("review_decision", decision.claimId, "appended", decision);
    return decision;
  },

  listReviewDecisions(claimId: string): ReviewDecision[] {
    return [...(store.reviewDecisions.get(claimId) || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  createSupportTicket(ticket: SupportTicket): SupportTicket {
    store.supportTickets.set(ticket.id, ticket);
    this.audit("support_ticket", ticket.id, "created", ticket);
    return ticket;
  },

  updateSupportTicket(ticket: SupportTicket): SupportTicket {
    store.supportTickets.set(ticket.id, ticket);
    this.audit("support_ticket", ticket.id, "updated", ticket);
    return ticket;
  },

  getSupportTicket(id: string): SupportTicket | undefined {
    return store.supportTickets.get(id);
  },

  listSupportTickets(workerId?: string): SupportTicket[] {
    const all = [...store.supportTickets.values()];
    return workerId ? all.filter((ticket) => ticket.workerId === workerId) : all;
  },

  createPayout(payout: PayoutTransaction): PayoutTransaction {
    store.payouts.set(payout.id, payout);
    store.idempotencyKeys.add(payout.idempotencyKey);
    this.audit("payout", payout.id, "created", payout);
    return payout;
  },

  updatePayout(payout: PayoutTransaction): PayoutTransaction {
    store.payouts.set(payout.id, payout);
    this.audit("payout", payout.id, "updated", payout);
    return payout;
  },

  getPayout(id: string): PayoutTransaction | undefined {
    return store.payouts.get(id);
  },

  findPayoutByIdempotencyKey(key: string): PayoutTransaction | undefined {
    return [...store.payouts.values()].find((payout) => payout.idempotencyKey === key);
  },

  findPayoutByClaim(claimId: string): PayoutTransaction | undefined {
    return [...store.payouts.values()].find((payout) => payout.claimId === claimId);
  },

  listPayoutsByStatus(status: PayoutTransaction["status"]): PayoutTransaction[] {
    return [...store.payouts.values()].filter((payout) => payout.status === status);
  },

  createLedgerEntry(entry: LedgerEntry): LedgerEntry {
    store.ledgerEntries.set(entry.id, entry);
    this.audit("ledger_entry", entry.id, "created", entry);
    return entry;
  },

  updateLedgerEntry(entry: LedgerEntry): LedgerEntry {
    store.ledgerEntries.set(entry.id, entry);
    this.audit("ledger_entry", entry.id, "updated", entry);
    return entry;
  },

  getLedgerEntry(id: string): LedgerEntry | undefined {
    return store.ledgerEntries.get(id);
  },

  findLedgerEntryByPayoutId(payoutId: string): LedgerEntry | undefined {
    return [...store.ledgerEntries.values()].find((entry) => entry.payoutId === payoutId);
  },

  listLedgerEntries(claimId?: string): LedgerEntry[] {
    const all = [...store.ledgerEntries.values()];
    return claimId ? all.filter((e) => e.claimId === claimId) : all;
  },

  createTrigger(trigger: TriggerEvent): TriggerEvent {
    store.triggers.set(trigger.id, trigger);
    this.audit("trigger_event", trigger.id, "created", trigger);
    return trigger;
  },

  listTriggers(): TriggerEvent[] {
    return [...store.triggers.values()];
  },

  saveOtpChallenge(phone: string, code: string, expiresAt: number): void {
    store.otpChallenges.set(phone, { code, expiresAt });
  },

  consumeOtpChallenge(phone: string, code: string): boolean {
    const challenge = store.otpChallenges.get(phone);
    if (!challenge) return false;
    const valid = challenge.code === code && challenge.expiresAt > Date.now();
    if (valid) {
      store.otpChallenges.delete(phone);
    }
    return valid;
  },

  saveSession(session: SessionRecord): SessionRecord {
    store.sessionsByAccessToken.set(session.accessToken, session);
    store.sessionsByRefreshToken.set(session.refreshToken, session);
    return session;
  },

  getSessionByAccessToken(accessToken: string): SessionRecord | undefined {
    const session = store.sessionsByAccessToken.get(accessToken);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) {
        this.revokeSession(session.accessToken);
      }
      return undefined;
    }
    return session;
  },

  getSessionByRefreshToken(refreshToken: string): SessionRecord | undefined {
    const session = store.sessionsByRefreshToken.get(refreshToken);
    if (!session || session.refreshExpiresAt <= Date.now()) {
      if (session) {
        this.revokeSession(session.accessToken);
      }
      return undefined;
    }
    return session;
  },

  revokeSession(accessToken: string): void {
    const session = store.sessionsByAccessToken.get(accessToken);
    if (!session) return;
    store.sessionsByAccessToken.delete(accessToken);
    store.sessionsByRefreshToken.delete(session.refreshToken);
  },

  listPayouts(): PayoutTransaction[] {
    return [...store.payouts.values()];
  },

  listWorkers(): Worker[] {
    return [...store.workers.values()];
  },

  listPolicies(): Policy[] {
    return [...store.policies.values()];
  },

  listWorkerPolicies(workerId: string): Policy[] {
    return this.listPolicies().filter((policy) => policy.workerId === workerId);
  },

  findActivePolicy(workerId: string, atIso: string): Policy | undefined {
    return this.listWorkerPolicies(workerId).find((policy) => policy.status === "active" && policy.startsAt <= atIso && policy.endsAt >= atIso);
  },

  createPolicyReminder(reminder: PolicyReminder): PolicyReminder {
    store.policyReminders.set(reminder.id, reminder);
    this.audit("policy_reminder", reminder.id, "created", reminder);
    return reminder;
  },

  updatePolicyReminder(reminder: PolicyReminder): PolicyReminder {
    store.policyReminders.set(reminder.id, reminder);
    this.audit("policy_reminder", reminder.id, "updated", reminder);
    return reminder;
  },

  listPolicyReminders(workerId?: string): PolicyReminder[] {
    const all = [...store.policyReminders.values()];
    if (!workerId) return all;
    return all.filter((reminder) => reminder.workerId === workerId);
  },

  recordRetentionEvent(event: RetentionEvent): RetentionEvent {
    store.retentionEvents.set(event.id, event);
    this.audit("retention_event", event.id, "recorded", event);
    return event;
  },

  listRetentionEvents(workerId?: string): RetentionEvent[] {
    const all = [...store.retentionEvents.values()];
    if (!workerId) return all;
    return all.filter((event) => event.workerId === workerId);
  },

  listClaims(): Claim[] {
    return [...store.claims.values()];
  },

  saveRiskProfile(profile: RiskProfile): RiskProfile {
    store.riskProfiles.set(profile.workerId, profile);
    this.audit("risk_profile", profile.workerId, "upserted", profile);
    return profile;
  },

  getRiskProfile(workerId: string): RiskProfile | undefined {
    return store.riskProfiles.get(workerId);
  },

  deleteRiskProfile(workerId: string): boolean {
    const existing = store.riskProfiles.get(workerId);
    if (!existing) {
      return false;
    }
    store.riskProfiles.delete(workerId);
    this.audit("risk_profile", workerId, "deleted", { workerId });
    return true;
  },

  listAuditLogs(): AuditRecord[] {
    return [...auditLogs.values()];
  },

  audit(entityType: string, entityId: string, action: string, payload: unknown): AuditRecord {
    const record: AuditRecord = {
      id: uuid(),
      entityType,
      entityId,
      action,
      payload: payload as Record<string, unknown>,
      createdAt: new Date().toISOString()
    };
    auditLogs.set(record.id, record);
    return record;
  }
};

export function resetRepository() {
  auditLogs.clear();
}
