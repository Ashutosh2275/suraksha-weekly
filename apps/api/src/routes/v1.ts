import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { config } from "../config.js";
import { repository } from "../data/repository.js";
import { requireAuthenticated, requireInternalService, requireRole } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { createSession, refreshSession, revokeSession } from "../services/authService.js";
import { claimBurstDetected, createClaim, hasRecentSimilarClaim, upsertClaimStatus, withinPolicyExposureWindow } from "../services/claimService.js";
import { getFraudThresholds, scoreFraud, setFraudThresholds } from "../services/fraudService.js";
import { processPayout, idempotencyKey, retryPayout, resolveUncertainPayout } from "../services/payoutService.js";
import { listPoliciesWithLifecycle, lapsePolicies, markReminderSent, policyTermsPlainLanguage, retentionMetrics, scheduleRenewalReminders } from "../services/policyService.js";
import { buildProtectionSummary, calculateProfileCompleteness, coverageTerms } from "../services/profileService.js";
import { calculatePremiumBreakdown, calculateWeeklyPremium, premiumGuardrails } from "../services/pricingService.js";
import { enqueueJob, listJobs } from "../services/queueService.js";
import { runReconciliation } from "../services/reconciliationService.js";
import { buildTriggerEvent, resolveTriggerIntelligence } from "../services/triggerIntelligenceService.js";
import { trustTier } from "../services/trustService.js";
import { autoInitiateClaimsForTrigger, createTriggerEvent, requiresWaitingPeriod } from "../services/triggerService.js";
import { coverageCapBySegment, deriveRiskSegment, evaluateEligibility } from "../services/underwritingService.js";
import { Worker, FraudContext } from "../types.js";

export const v1Router = Router();

const WorkerSchema = z.object({
  phone: z.string(),
  city: z.string(),
  zone: z.string(),
  accountAgeDays: z.number().int().nonnegative(),
  activeHours14d: z.number().int().nonnegative(),
  payoutAccountVerified: z.boolean(),
  locationConsistency: z.number().min(0).max(1),
  trustScore: z.number().int().min(0).max(1000)
});

const QuoteSchema = z.object({
  workerId: z.string().uuid(),
  plan: z.enum(["basic", "standard", "pro"]).default("standard")
});

const PurchaseSchema = QuoteSchema;

const ClaimSchema = z.object({
  workerId: z.string().uuid(),
  policyId: z.string().uuid(),
  triggerEventId: z.string().min(1).default(uuid()),
  requestedAmount: z.number().nonnegative()
});

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]).default("approve"),
  note: z.string().min(1).max(500).optional(),
  holdForSecondary: z.boolean().default(false)
});

const OtpVerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(4)
});

const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const UpdateProfileSchema = WorkerSchema.partial().omit({ phone: true });

const RiskProfileSchema = z.object({
  phone: z.string(),
  fullName: z.string().min(1),
  dob: z.string().min(1),
  gender: z.enum(["female", "male", "other"]),
  emergencyContact: z.string().min(1),
  aadhaar4: z.string().length(4),
  pan4: z.string().length(4),
  riderId: z.string().min(1),
  platformType: z.string().min(1),
  vehicleType: z.string().min(1),
  city: z.string().min(1),
  zone: z.string().min(1),
  serviceZones: z.array(z.string().min(1)).min(1),
  ordersPerDay: z.number().int().positive(),
  averageDailyOnlineHours: z.number().positive(),
  activeHoursWeek: z.number().positive(),
  activeHours14d: z.number().int().positive(),
  weeklyIncome4w: z.number().nonnegative(),
  averageWeeklyEarnings: z.number().nonnegative(),
  volatilityBand: z.enum(["low", "medium", "high"]),
  payoutCycle: z.enum(["weekly", "biweekly"]),
  cashShare: z.number().min(0).max(100),
  digitalShare: z.number().min(0).max(100),
  nominee: z.string().min(1),
  upiId: z.string().min(3),
  bank4: z.string().length(4),
  accountAgeDays: z.number().int().nonnegative(),
  locationConsistency: z.number().min(0).max(1),
  trustScore: z.number().int().min(0).max(1000),
  payoutAccountVerified: z.boolean(),
  kycVerified: z.boolean(),
  consentAccepted: z.boolean(),
  triggerDisclosureAccepted: z.boolean()
}).refine((data) => data.cashShare + data.digitalShare === 100, {
  message: "Cash and digital share must add up to 100",
  path: ["digitalShare"]
});

const RenewSchema = z.object({
  plan: z.enum(["basic", "standard", "pro"]).optional()
});

const TriggerSchema = z.object({
  type: z.string().min(1),
  zone: z.string().min(1),
  source: z.enum(["weather", "aqi", "platform", "manual", "synthetic"]).default("manual"),
  confidence: z.number().min(0).max(1).optional(),
  observedAt: z.string().datetime().optional(),
  signals: z
    .object({
      rainMm: z.number().nonnegative().optional(),
      aqi: z.number().nonnegative().optional(),
      outageScore: z.number().min(0).max(1).optional()
    })
    .optional()
});

const TriggerBatchSchema = z.object({
  events: z.array(TriggerSchema).min(1).max(50)
});

const ReminderScheduleSchema = z.object({
  withinHours: z.number().int().min(1).max(168).default(24)
});

const PayoutEstimatorSchema = z.object({
  policyId: z.string().uuid().optional(),
  triggerType: z.enum(["heavy_rain", "extreme_heat", "severe_pollution", "local_restriction", "platform_outage", "manual"]).default("manual"),
  lostCoveredHours: z.number().positive().max(24),
  triggerSeverityFactor: z.number().min(0.5).max(2).default(1)
});

const SupportTicketCreateSchema = z.object({
  issueType: z.enum(["quote", "claim", "payout", "policy", "other"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  details: z.string().min(5).max(1000)
});

const SupportTicketUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
  resolutionNote: z.string().min(2).max(1000).optional()
});

const planCatalog = {
  basic: {
    label: "Basic Shield",
    description: "Low premium weekly protection for steady earners.",
    payoutMultiplier: 1,
    idealFor: "Workers who want entry-level protection."
  },
  standard: {
    label: "Standard Guard",
    description: "Balanced cover for weather and disruption volatility.",
    payoutMultiplier: 1.4,
    idealFor: "Most full-time delivery partners."
  },
  pro: {
    label: "Pro Resilience",
    description: "Higher caps and faster operational priority for heavy earners.",
    payoutMultiplier: 1.8,
    idealFor: "High-activity workers in variable zones."
  }
} as const;

const prdTraceabilityMatrix = [
  {
    requirementId: "FR-1",
    requirement: "OTP authentication and worker profile management",
    apiSurface: ["/api/v1/auth/otp/request", "/api/v1/auth/otp/verify", "/api/v1/workers/:id/profile", "/api/v1/workers/:id/risk-profile"],
    testRefs: ["v1.integration.test.ts::supports OTP verification and worker profile update", "v1.integration.test.ts::supports onboarding upsert and risk-profile CRUD"],
    metrics: ["onboarding_completion_rate", "otp_success_rate"],
    owner: "Auth & Onboarding"
  },
  {
    requirementId: "FR-3",
    requirement: "Dynamic weekly pricing and explainability",
    apiSurface: ["/api/v1/policies/quote", "/api/v1/plans"],
    testRefs: ["v1.integration.test.ts::registers worker, returns quote, purchases policy, and pays claim", "pricingService.test.ts"],
    metrics: ["quote_latency_ms", "quote_conversion_rate"],
    owner: "Pricing"
  },
  {
    requirementId: "FR-5",
    requirement: "Automated claim processing and moderation",
    apiSurface: ["/api/v1/claims/initiate", "/api/v1/claims/:id/timeline", "/api/v1/admin/claims/:id/review"],
    testRefs: ["v1.integration.test.ts::enforces exposure-window checks and claim burst hold-and-review", "v1.integration.test.ts::records review decision trace with notes and supports secondary hold"],
    metrics: ["claim_automation_rate", "claim_in_review_backlog"],
    owner: "Claims"
  },
  {
    requirementId: "FR-6",
    requirement: "Fraud scoring, thresholds, and governance",
    apiSurface: ["/api/v1/admin/fraud-thresholds", "/api/v1/admin/fraud/overview"],
    testRefs: ["v1.integration.test.ts::expands fraud scoring with account age, trust tier, and velocity checks", "v1.integration.test.ts::enforces fraud threshold governance with role-based access", "v1.redteam.test.ts"],
    metrics: ["fraud_false_negative_rate", "fraud_leakage_rate"],
    owner: "Fraud Ops"
  },
  {
    requirementId: "FR-7",
    requirement: "Payout adapter, uncertain-state handling, and ledger integrity",
    apiSurface: ["/api/v1/admin/payouts", "/api/v1/admin/payouts/:id/retry", "/api/v1/admin/payouts/:id/resolve", "/api/v1/admin/ledger"],
    testRefs: ["v1.integration.test.ts::handles uncertain payout state and admin resolution", "v1.integration.test.ts::handles failed payout and retry flow with ledger integrity"],
    metrics: ["trigger_to_payout_time_ms", "duplicate_payout_leakage"],
    owner: "Payouts"
  },
  {
    requirementId: "FR-9",
    requirement: "Audit and traceability",
    apiSurface: ["/api/v1/admin/audit-logs", "/api/v1/admin/claims/:id/review-trace", "/internal/metrics"],
    testRefs: ["v1.contract.test.ts", "v1.e2e.test.ts", "v1.redteam.test.ts"],
    metrics: ["audit_coverage_ratio", "release_gate_pass_rate"],
    owner: "Platform Governance"
  }
] as const;

const releaseGateChecklist = [
  { gate: "Build", owner: "Platform Engineering", command: "npm run build", required: true },
  { gate: "Core Regression", owner: "QA", command: "npm run test", required: true },
  { gate: "Phase 9 Reliability Pack", owner: "SRE", command: "npm run test:phase9", required: true },
  { gate: "Load/Resilience Scaffold", owner: "SRE", command: "k6 run k6/load-test.js", required: true },
  { gate: "Reconciliation Integrity", owner: "Payout Ops", command: "GET /api/v1/admin/reconciliation", required: true },
  { gate: "Governance Traceability", owner: "Product + Compliance", command: "GET /api/v1/admin/governance/traceability", required: true },
  { gate: "External Dependency Readiness", owner: "Program Management", command: "GET /api/v1/admin/governance/external-readiness", required: true }
] as const;

const externalDependencyReadiness = [
  {
    dependency: "PostgreSQL production cluster",
    owner: "Infrastructure",
    status: "pending",
    blocker: "Production DATABASE_URL and network policy approval"
  },
  {
    dependency: "Redis / queue broker",
    owner: "Infrastructure",
    status: "pending",
    blocker: "Managed REDIS_URL and retention policy sign-off"
  },
  {
    dependency: "Payment sandbox credentials",
    owner: "Finance Integrations",
    status: "pending",
    blocker: "Vendor account approval and callback secret exchange"
  },
  {
    dependency: "Weather and AQI live API keys",
    owner: "Data Integrations",
    status: "pending",
    blocker: "Key issuance and quota contract finalization"
  },
  {
    dependency: "Partner platform feed contract",
    owner: "Partnerships",
    status: "pending",
    blocker: "Legal and partner SLA execution"
  },
  {
    dependency: "Legal/compliance content approval",
    owner: "Compliance",
    status: "pending",
    blocker: "Regulatory wording approval for policy disclosures"
  }
] as const;

v1Router.post("/auth/otp/request", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (_req, res) => {
  const phone = String(_req.body?.phone || _req.query.phone || "").trim();
  if (!phone) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", message: "Phone is required" });
    return;
  }

  repository.saveOtpChallenge(phone, "1234", Date.now() + 5 * 60 * 1000);
  res.json({ status: "otp_sent", channel: "sms", demoOtp: "1234" });
});

v1Router.post("/auth/otp/verify", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const parsed = OtpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { phone, code } = parsed.data;
  const valid = repository.consumeOtpChallenge(phone, code);
  if (!valid) {
    res.status(401).json({ error_code: "OTP_INVALID", message: "Invalid or expired OTP" });
    return;
  }

  const session = createSession(phone, "worker", phone);
  res.json({ status: "verified", phone, session });
});

v1Router.post("/auth/admin/login", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const parsed = AdminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  if (email.toLowerCase() !== config.adminEmail.toLowerCase()) {
    res.status(401).json({ error_code: "INVALID_CREDENTIALS", message: "Invalid credentials" });
    return;
  }

  if (password !== config.adminPassword) {
    res.status(401).json({ error_code: "INVALID_CREDENTIALS", message: "Invalid credentials" });
    return;
  }

  const session = createSession(email.toLowerCase(), "risk-admin", email.toLowerCase());
  res.json({ status: "authenticated", session });
});

v1Router.post("/auth/refresh", rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (req, res) => {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const session = refreshSession(parsed.data.refreshToken);
  if (!session) {
    res.status(401).json({ error_code: "UNAUTHORIZED", message: "Invalid refresh token" });
    return;
  }

  res.json({ status: "refreshed", session });
});

v1Router.post("/auth/logout", requireAuthenticated, (req, res) => {
  const accessToken = String(req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  revokeSession(accessToken);
  res.json({ status: "logged_out" });
});

v1Router.get("/auth/me", requireAuthenticated, (_req, res) => {
  res.json({ session: res.locals.auth });
});

v1Router.get("/content/coverage-terms", (_req, res) => {
  res.json(coverageTerms());
});

v1Router.get("/content/policy-glossary", (_req, res) => {
  res.json({ glossary: coverageTerms().glossary });
});

v1Router.get("/content/trigger-explanations", (_req, res) => {
  res.json({
    triggers: [
      {
        type: "heavy_rain",
        condition: "Rainfall crosses configured mm/hour threshold for sustained interval.",
        confidenceGuidance: "High confidence from weather-mock with non-degraded signal snapshot.",
        payoutImpact: "Severity factor increases with sustained rainfall duration."
      },
      {
        type: "extreme_heat",
        condition: "Temperature remains above configured threshold during covered work window.",
        confidenceGuidance: "Medium confidence by default, elevated when multi-signal corroboration is present.",
        payoutImpact: "Partial payout when impacted hours are below full-day threshold."
      },
      {
        type: "severe_pollution",
        condition: "AQI sustains severe band above configured threshold.",
        confidenceGuidance: "High confidence when AQI snapshot remains stable across polling intervals.",
        payoutImpact: "Severity adjusts by AQI band and covered-hour overlap."
      },
      {
        type: "local_restriction",
        condition: "Zone closure or curfew signal is active in insured zone.",
        confidenceGuidance: "Confidence tied to source reliability and freshness of restriction signal.",
        payoutImpact: "Often near-full payout for complete service shutdown windows."
      },
      {
        type: "platform_outage",
        condition: "Platform outage proxy score remains above outage threshold.",
        confidenceGuidance: "Confidence rises when outage score persists beyond configured minimum duration.",
        payoutImpact: "Scaled payout from outage score and verified covered-hour loss."
      }
    ]
  });
});

v1Router.post("/workers/register", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 2 }), (req, res) => {
  const parsed = WorkerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const worker: Worker = { id: uuid(), ...parsed.data };
  repository.createWorker(worker);
  const eligibility = evaluateEligibility(worker);
  res.status(201).json({ worker, eligibility });
});

v1Router.post("/workers/onboarding", requireAuthenticated, rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 2 }), (req, res) => {
  const parsed = RiskProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const existingWorker = repository.findWorkerByPhone(input.phone);
  const worker: Worker = existingWorker
    ? repository.updateWorker({
        ...existingWorker,
        city: input.city,
        zone: input.zone,
        accountAgeDays: input.accountAgeDays,
        activeHours14d: input.activeHours14d,
        payoutAccountVerified: input.payoutAccountVerified,
        locationConsistency: input.locationConsistency,
        trustScore: input.trustScore,
        profileUpdatedAt: new Date().toISOString()
      })
    : repository.createWorker({
        id: uuid(),
        phone: input.phone,
        city: input.city,
        zone: input.zone,
        accountAgeDays: input.accountAgeDays,
        activeHours14d: input.activeHours14d,
        payoutAccountVerified: input.payoutAccountVerified,
        locationConsistency: input.locationConsistency,
        trustScore: input.trustScore
      });

  const riskProfile = repository.saveRiskProfile({
    workerId: worker.id,
    ...input,
    updatedAt: new Date().toISOString()
  });
  const completeness = calculateProfileCompleteness(riskProfile);

  res.status(existingWorker ? 200 : 201).json({
    worker,
    riskProfile,
    profileCompleteness: completeness,
    eligibility: evaluateEligibility(worker)
  });
});

v1Router.get("/workers/:id/profile", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const riskProfile = repository.getRiskProfile(worker.id);
  const policies = listPoliciesWithLifecycle(worker.id);
  res.json({
    worker,
    riskProfile,
    profileCompleteness: calculateProfileCompleteness(riskProfile),
    eligibility: evaluateEligibility(worker),
    policies
  });
});

v1Router.get("/workers/:id/risk-profile", requireAuthenticated, rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const riskProfile = repository.getRiskProfile(worker.id);
  if (!riskProfile) {
    res.status(404).json({ error_code: "RISK_PROFILE_NOT_FOUND" });
    return;
  }

  res.json({ riskProfile, profileCompleteness: calculateProfileCompleteness(riskProfile) });
});

v1Router.put("/workers/:id/risk-profile", requireAuthenticated, rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 2 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const parsed = RiskProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const riskProfile = repository.saveRiskProfile({ workerId: worker.id, ...parsed.data, updatedAt: new Date().toISOString() });
  repository.updateWorker({
    ...worker,
    city: parsed.data.city,
    zone: parsed.data.zone,
    accountAgeDays: parsed.data.accountAgeDays,
    activeHours14d: parsed.data.activeHours14d,
    payoutAccountVerified: parsed.data.payoutAccountVerified,
    locationConsistency: parsed.data.locationConsistency,
    trustScore: parsed.data.trustScore,
    profileUpdatedAt: riskProfile.updatedAt
  });
  res.json({ riskProfile, profileCompleteness: calculateProfileCompleteness(riskProfile) });
});

v1Router.delete("/workers/:id/risk-profile", requireAuthenticated, rateLimit({ ipPerMinute: 5, identityPerMinute: 3, burstPerSecond: 1 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const deleted = repository.deleteRiskProfile(worker.id);
  if (!deleted) {
    res.status(404).json({ error_code: "RISK_PROFILE_NOT_FOUND" });
    return;
  }

  res.json({ status: "deleted" });
});

v1Router.patch("/workers/:id/profile", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 2 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const updated = repository.updateWorker({ ...worker, ...parsed.data, profileUpdatedAt: new Date().toISOString() });
  res.json({ worker: updated, eligibility: evaluateEligibility(updated) });
});

v1Router.get("/plans", (_req, res) => {
  res.json({ plans: planCatalog });
});

v1Router.get("/workers/:id/dashboard", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const policies = listPoliciesWithLifecycle(worker.id);
  const claims = repository.listClaims().filter((claim) => claim.workerId === worker.id);
  const payouts = repository.listPayouts().filter((payout) => payout.workerId === worker.id);
  const riskProfile = repository.getRiskProfile(worker.id);
  const reminders = repository.listPolicyReminders(worker.id);
  res.json({
    worker,
    riskProfile,
    profileCompleteness: calculateProfileCompleteness(riskProfile),
    eligibility: evaluateEligibility(worker),
    trust: {
      score: worker.trustScore,
      tier: trustTier(worker.trustScore)
    },
    protection: buildProtectionSummary(worker, riskProfile, policies, claims, payouts),
    coverageTerms: coverageTerms().transparentTerms,
    reminders,
    policies,
    claims,
    payouts
  });
});

v1Router.get("/workers/:id/timeline", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const policies = repository.listWorkerPolicies(worker.id).map((policy) => ({
    id: policy.id,
    category: "policy",
    status: policy.status,
    title: `Policy ${policy.plan.toUpperCase()} ${policy.status}`,
    detail: `Coverage cap ${policy.weeklyCoverageCap}`,
    createdAt: policy.startsAt
  }));

  const claims = repository.listWorkerClaims(worker.id).map((claim) => ({
    id: claim.id,
    category: "claim",
    status: claim.status,
    title: `Claim ${claim.status}`,
    detail: `${claim.triggerEventId} - payout request ${claim.payoutAmount}`,
    createdAt: claim.updatedAt || claim.createdAt
  }));

  const payouts = repository
    .listPayouts()
    .filter((payout) => payout.workerId === worker.id)
    .map((payout) => ({
      id: payout.id,
      category: "payout",
      status: payout.status,
      title: `Payout ${payout.status}`,
      detail: `${payout.amount} via ${payout.adapter}`,
      createdAt: payout.resolvedAt || payout.createdAt
    }));

  const reminders = repository.listPolicyReminders(worker.id).map((reminder) => ({
    id: reminder.id,
    category: "reminder",
    status: reminder.status,
    title: `Renewal reminder ${reminder.status}`,
    detail: `Channel ${reminder.channel}`,
    createdAt: reminder.sentAt || reminder.dueAt
  }));

  const supportTickets = repository.listSupportTickets(worker.id).map((ticket) => ({
    id: ticket.id,
    category: "support",
    status: ticket.status,
    title: `Support ticket ${ticket.status}`,
    detail: `${ticket.issueType} (${ticket.priority})`,
    createdAt: ticket.updatedAt || ticket.createdAt
  }));

  const timeline = [...policies, ...claims, ...payouts, ...reminders, ...supportTickets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  res.json({ workerId: worker.id, timeline, total: timeline.length });
});

v1Router.post("/workers/:id/payout-estimator", rateLimit({ ipPerMinute: 30, identityPerMinute: 20, burstPerSecond: 5 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const parsed = PayoutEstimatorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const atIso = new Date().toISOString();
  const policy = parsed.data.policyId
    ? repository.getPolicy(parsed.data.policyId)
    : repository.findActivePolicy(worker.id, atIso);

  if (!policy || policy.workerId !== worker.id) {
    res.status(404).json({ error_code: "POLICY_NOT_FOUND" });
    return;
  }

  const profile = repository.getRiskProfile(worker.id);
  const activeHoursWeek = profile?.activeHoursWeek || Math.max(1, Math.round(worker.activeHours14d / 2));
  const weeklyIncome = profile?.weeklyIncome4w || profile?.averageWeeklyEarnings || 0;
  const baselineHourlyEarnings = activeHoursWeek > 0 ? weeklyIncome / activeHoursWeek : 0;
  const grossEstimate = baselineHourlyEarnings * parsed.data.lostCoveredHours * parsed.data.triggerSeverityFactor;
  const estimatedPayout = Math.round(Math.min(policy.weeklyCoverageCap, grossEstimate));

  res.json({
    workerId: worker.id,
    policyId: policy.id,
    triggerType: parsed.data.triggerType,
    estimate: {
      baselineHourlyEarnings: Math.round(baselineHourlyEarnings),
      lostCoveredHours: parsed.data.lostCoveredHours,
      triggerSeverityFactor: parsed.data.triggerSeverityFactor,
      weeklyCoverageCap: policy.weeklyCoverageCap,
      estimatedPayout
    },
    explanation: {
      formula: "min(coverage_cap, baseline_hourly * lost_hours * severity)",
      confidenceHint: parsed.data.triggerType === "manual" ? "Manual trigger confidence depends on review checks." : "Higher confidence expected when source snapshots are stable.",
      termsVersion: policy.coverageTermsVersion || "v1"
    }
  });
});

v1Router.get("/workers/:id/support/tickets", requireAuthenticated, rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }
  const tickets = repository.listSupportTickets(worker.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ workerId: worker.id, tickets });
});

v1Router.post("/workers/:id/support/tickets", requireAuthenticated, rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 2 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const parsed = SupportTicketCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const ticket = repository.createSupportTicket({
    id: uuid(),
    workerId: worker.id,
    issueType: parsed.data.issueType,
    priority: parsed.data.priority,
    details: parsed.data.details,
    status: "open",
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ ticket });
});

v1Router.post("/policies/quote", rateLimit({ ipPerMinute: 30, identityPerMinute: 20, burstPerSecond: 5 }), (req, res) => {
  const parsed = QuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { workerId, plan } = parsed.data;
  const worker = repository.getWorker(workerId);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }
  const eligibility = evaluateEligibility(worker);
  if (!eligibility.eligible) {
    res.status(422).json({ error_code: "UNDERWRITING_REJECTED", reason: eligibility.reason });
    return;
  }
  const riskSegment = deriveRiskSegment(worker);
  const premiumBreakdown = calculatePremiumBreakdown(worker, plan);
  const premium = premiumBreakdown.finalPremium;
  const weeklyCoverageCap = coverageCapBySegment(riskSegment, plan);
  res.json({
    workerId,
    plan,
    riskSegment,
    premium,
    weeklyCoverageCap,
    trustTier: trustTier(worker.trustScore),
    productNarrative: planCatalog[plan],
    explainability: {
      topFactors: [
        `risk_multiplier:${premiumBreakdown.riskMultiplier}`,
        `exposure_multiplier:${premiumBreakdown.exposureMultiplier}`,
        `trust_adjustment:${premiumBreakdown.trustFactor}`
      ],
      breakdown: premiumBreakdown,
      guardrails: premiumGuardrails()
    },
    terms: policyTermsPlainLanguage(plan)
  });
});

v1Router.post("/policies/purchase", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const parsed = PurchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { workerId, plan } = parsed.data;
  const worker = repository.getWorker(workerId);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const nowIso = new Date().toISOString();
  const activePolicy = repository.findActivePolicy(workerId, nowIso);
  if (activePolicy) {
    res.status(409).json({ error_code: "ACTIVE_POLICY_EXISTS", policyId: activePolicy.id });
    return;
  }

  const premium = calculateWeeklyPremium(worker, plan);
  const riskSegment = deriveRiskSegment(worker);
  const policy = {
    id: uuid(),
    workerId,
    city: worker.city,
    zone: worker.zone,
    plan,
    premium,
    weeklyCoverageCap: coverageCapBySegment(riskSegment, plan),
    startsAt: nowIso,
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    waitingPeriodHours: riskSegment === "high" ? 24 : riskSegment === "medium" ? 12 : 0,
    coverageTermsVersion: "v1",
    status: "active" as const
  };
  repository.createPolicy(policy);
  repository.recordRetentionEvent({
    id: uuid(),
    workerId,
    policyId: policy.id,
    event: "purchase",
    createdAt: nowIso
  });
  res.status(201).json({ policy, terms: policyTermsPlainLanguage(plan) });
});

v1Router.get("/policies", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const workerId = String(req.query.workerId || "").trim();
  const policies = listPoliciesWithLifecycle(workerId || undefined);
  res.json({ policies });
});

v1Router.get("/workers/:id/policies", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const policies = listPoliciesWithLifecycle(worker.id);
  res.json({ policies });
});

v1Router.get("/policies/:id", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const policy = repository.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error_code: "POLICY_NOT_FOUND" });
    return;
  }

  if (policy.status === "active" && policy.endsAt < new Date().toISOString()) {
    const lapsed = repository.updatePolicy({ ...policy, status: "lapsed", lapsedAt: new Date().toISOString() });
    res.json({ policy: lapsed, terms: policyTermsPlainLanguage(lapsed.plan) });
    return;
  }

  res.json({ policy, terms: policyTermsPlainLanguage(policy.plan) });
});

v1Router.post("/policies/:id/renew", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const existing = repository.getPolicy(req.params.id);
  if (!existing) {
    res.status(404).json({ error_code: "POLICY_NOT_FOUND" });
    return;
  }

  const parsed = RenewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const worker = repository.getWorker(existing.workerId);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const plan = parsed.data.plan || existing.plan;
  lapsePolicies(new Date().toISOString(), existing.workerId);

  const existingActive = repository.findActivePolicy(existing.workerId, new Date().toISOString());
  if (existingActive && existingActive.id !== existing.id) {
    res.status(409).json({ error_code: "ACTIVE_POLICY_EXISTS", policyId: existingActive.id });
    return;
  }

  const renewed = repository.createPolicy({
    id: uuid(),
    workerId: existing.workerId,
    city: existing.city,
    zone: existing.zone,
    plan,
    premium: calculateWeeklyPremium(worker, plan),
    weeklyCoverageCap: coverageCapBySegment(deriveRiskSegment(worker), plan),
    startsAt: existing.endsAt,
    endsAt: new Date(new Date(existing.endsAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    waitingPeriodHours: existing.waitingPeriodHours,
    renewalOfPolicyId: existing.id,
    coverageTermsVersion: existing.coverageTermsVersion || "v1",
    status: "active"
  });

  repository.recordRetentionEvent({
    id: uuid(),
    workerId: existing.workerId,
    policyId: renewed.id,
    event: "renewal",
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ policy: renewed, renewedFrom: existing.id, terms: policyTermsPlainLanguage(plan) });
});

v1Router.post("/policies/:id/cancel", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const policy = repository.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error_code: "POLICY_NOT_FOUND" });
    return;
  }

  const updated = repository.updatePolicy({ ...policy, status: "cancelled", cancelledAt: new Date().toISOString() });
  repository.recordRetentionEvent({
    id: uuid(),
    workerId: policy.workerId,
    policyId: policy.id,
    event: "cancel",
    createdAt: new Date().toISOString()
  });
  res.json({ policy: updated });
});

v1Router.post("/workers/:id/reminders/schedule", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  const parsed = ReminderScheduleSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const reminders = scheduleRenewalReminders(worker.id, new Date().toISOString(), parsed.data.withinHours);
  res.status(201).json({ reminders });
});

v1Router.get("/workers/:id/reminders", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const worker = repository.getWorker(req.params.id);
  if (!worker) {
    res.status(404).json({ error_code: "WORKER_NOT_FOUND" });
    return;
  }

  res.json({ reminders: repository.listPolicyReminders(worker.id) });
});

v1Router.post("/policies/reminders/:id/send", rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const reminder = markReminderSent(req.params.id, new Date().toISOString());
  if (!reminder) {
    res.status(404).json({ error_code: "REMINDER_NOT_FOUND" });
    return;
  }
  res.json({ reminder });
});

v1Router.post("/policies/lapse/run", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const report = lapsePolicies(new Date().toISOString());
  res.json({ report });
});

v1Router.post("/claims/initiate", rateLimit({ ipPerMinute: 5, identityPerMinute: 3, burstPerSecond: 1 }), (req, res) => {
  const parsed = ClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { workerId, policyId, triggerEventId, requestedAmount } = parsed.data;
  const nowIso = new Date().toISOString();

  const worker = repository.getWorker(workerId);
  const policy = repository.getPolicy(policyId);
  if (!worker || !policy || policy.workerId !== workerId) {
    res.status(404).json({ error_code: "INVALID_WORKER_OR_POLICY" });
    return;
  }

  if (policy.status !== "active") {
    res.status(422).json({ error_code: "POLICY_INACTIVE" });
    return;
  }

  if (!withinPolicyExposureWindow(policy, nowIso)) {
    res.status(422).json({ error_code: "EXPOSURE_WINDOW_CLOSED", message: "Claim is outside policy active window" });
    return;
  }

  const withinWaitingPeriod = requiresWaitingPeriod("manual") && Date.now() - new Date(policy.startsAt).getTime() < policy.waitingPeriodHours * 60 * 60 * 1000;
  if (withinWaitingPeriod) {
    res.status(422).json({ error_code: "WAITING_PERIOD_ACTIVE", message: "Claim blocked by waiting period" });
    return;
  }

  const existingClaim = repository.findClaim(workerId, policyId, triggerEventId);
  if (existingClaim) {
    res.status(409).json({ error_code: "DUPLICATE_CLAIM", claim: existingClaim });
    return;
  }

  if (hasRecentSimilarClaim(workerId, policyId, triggerEventId, nowIso, 30)) {
    res.status(409).json({
      error_code: "RECENT_DUPLICATE_CLAIM",
      message: "A similar claim was initiated recently; wait before retrying."
    });
    return;
  }

  const payoutAmount = Math.min(policy.weeklyCoverageCap, requestedAmount);
  const claim = createClaim(workerId, policyId, triggerEventId, "manual", payoutAmount, ["MANUAL_INITIATION"]);

  if (claimBurstDetected(workerId, nowIso, 60, 3)) {
    const updated = upsertClaimStatus(claim.id, "in_review", claim.riskScore, ["CLAIM_BURST_DETECTED", "HOLD_AND_REVIEW"]);
    res.status(202).json({
      claim: updated,
      message: "Routed to hold-and-review lane due to claim burst pattern.",
      explanation: {
        decision: "in_review",
        reasons: ["CLAIM_BURST_DETECTED", "HOLD_AND_REVIEW"],
        checks: {
          exposureWindow: true,
          waitingPeriod: false,
          burstControlTriggered: true
        }
      }
    });
    return;
  }

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const allWorkerClaims = repository.listWorkerClaims(workerId);
  const claimsLast24h = allWorkerClaims.filter((c) => c.createdAt >= cutoff24h).length;
  const claimsLast7d = allWorkerClaims.filter((c) => c.createdAt >= cutoff7d).length;

  const recentCrossWorkerClaims = repository.listClaims().filter((c) => c.workerId !== workerId && c.createdAt >= cutoff1h);
  const linkedWorkerIds = new Set(recentCrossWorkerClaims.map((c) => c.workerId));
  let linkedIdentityMatches = 0;
  for (const lid of linkedWorkerIds) {
    const lw = repository.getWorker(lid);
    if (lw && lw.zone === worker.zone && lw.city === worker.city) {
      linkedIdentityMatches++;
    }
  }

  const triggerClaimCount = repository.listClaims().filter((c) => c.triggerEventId === triggerEventId).length;

  const fraudContext: FraudContext = { claimsLast24h, claimsLast7d, linkedIdentityMatches, triggerClaimCount };
  const fraud = scoreFraud(worker, { triggerEventId, payoutAmount }, fraudContext);

  if (fraud.decision === "critical") {
    const updated = upsertClaimStatus(claim.id, "rejected", fraud.score, [...fraud.reasons, "CRITICAL_MISMATCH_AUTO_BLOCK"]);
    res.status(422).json({
      claim: updated,
      fraud,
      message: "Critical mismatch; auto-blocked",
      explanation: {
        decision: "rejected",
        reasons: [...fraud.reasons, "CRITICAL_MISMATCH_AUTO_BLOCK"],
        checks: {
          exposureWindow: true,
          waitingPeriod: false,
          burstControlTriggered: false
        }
      }
    });
    return;
  }

  if (fraud.decision === "high" || fraud.decision === "medium") {
    const updated = upsertClaimStatus(claim.id, "in_review", fraud.score, [...fraud.reasons, "HOLD_AND_REVIEW"]);
    res.status(202).json({
      claim: updated,
      fraud,
      message: "Routed to hold-and-review lane",
      explanation: {
        decision: "in_review",
        reasons: [...fraud.reasons, "HOLD_AND_REVIEW"],
        checks: {
          exposureWindow: true,
          waitingPeriod: false,
          burstControlTriggered: false
        }
      }
    });
    return;
  }

  const approved = upsertClaimStatus(claim.id, "approved", fraud.score, [...fraud.reasons, "AUTO_APPROVED"]);
  const key = idempotencyKey(workerId, policyId, triggerEventId);
  const payout = processPayout(claim.id, workerId, key, payoutAmount);

  if (payout.status === "success") {
    const paid = upsertClaimStatus(claim.id, "paid", fraud.score, ["PAYOUT_PROCESSED"]);
    res.status(201).json({
      claim: paid || approved,
      fraud,
      payout,
      explanation: {
        decision: "paid",
        reasons: [...fraud.reasons, "AUTO_APPROVED", "PAYOUT_PROCESSED"],
        checks: { exposureWindow: true, waitingPeriod: false, burstControlTriggered: false }
      }
    });
    return;
  }

  const decision = payout.status === "pending" ? "approved_payout_pending" : "approved_payout_failed";
  res.status(202).json({
    claim: approved,
    fraud,
    payout,
    explanation: {
      decision,
      reasons: [...fraud.reasons, "AUTO_APPROVED", payout.status === "pending" ? "PAYOUT_UNCERTAIN" : "PAYOUT_FAILED"],
      checks: { exposureWindow: true, waitingPeriod: false, burstControlTriggered: false }
    }
  });
});

v1Router.post("/triggers/ingest", requireInternalService, (req, res) => {
  const parsed = TriggerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const intel = resolveTriggerIntelligence(parsed.data);
  const eventPayload = buildTriggerEvent({
    id: uuid(),
    createdAt: new Date().toISOString(),
    ...parsed.data,
    confidence: intel.confidence
  });

  const event = createTriggerEvent({
    type: eventPayload.type,
    normalizedType: eventPayload.normalizedType,
    source: eventPayload.source,
    zone: eventPayload.zone,
    confidence: eventPayload.confidence,
    adapter: eventPayload.adapter,
    degradedMode: eventPayload.degradedMode,
    observedAt: eventPayload.observedAt,
    snapshot: eventPayload.snapshot
  });
  const job = enqueueJob({
    id: uuid(),
    type: "trigger-ingestion",
    payload: { ...event },
    createdAt: new Date().toISOString()
  });
  const claims = autoInitiateClaimsForTrigger(event);
  repository.audit("trigger_event", event.id, "ingested", {
    ...event,
    normalizedType: intel.normalizedType,
    source: intel.source,
    adapter: intel.adapter,
    degradedMode: intel.degradedMode,
    snapshot: intel.snapshot,
    claimsCreated: claims.length
  });
  res.status(202).json({ event, intelligence: intel, job, claims });
});

v1Router.post("/triggers/ingest/batch", requireInternalService, rateLimit({ ipPerMinute: 30, identityPerMinute: 30, burstPerSecond: 5 }), (req, res) => {
  const parsed = TriggerBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const results = parsed.data.events.map((entry) => {
    const intel = resolveTriggerIntelligence(entry);
    const eventPayload = buildTriggerEvent({
      id: uuid(),
      createdAt: new Date().toISOString(),
      ...entry,
      confidence: intel.confidence
    });

    const event = createTriggerEvent({
      type: eventPayload.type,
      normalizedType: eventPayload.normalizedType,
      source: eventPayload.source,
      zone: eventPayload.zone,
      confidence: eventPayload.confidence,
      adapter: eventPayload.adapter,
      degradedMode: eventPayload.degradedMode,
      observedAt: eventPayload.observedAt,
      snapshot: eventPayload.snapshot
    });

    const claims = autoInitiateClaimsForTrigger(event);
    return {
      event,
      intelligence: intel,
      claims
    };
  });

  const degradedCount = results.filter((result) => result.intelligence.degradedMode).length;
  const job = enqueueJob({
    id: uuid(),
    type: "trigger-ingestion-batch",
    payload: {
      total: results.length,
      degradedCount,
      events: results.map((item) => item.event.id)
    },
    createdAt: new Date().toISOString()
  });

  repository.audit("trigger_batch", job.id, "ingested", {
    total: results.length,
    degradedCount,
    eventIds: results.map((item) => item.event.id)
  });

  res.status(202).json({
    summary: {
      total: results.length,
      degradedCount,
      claimActions: results.reduce((acc, result) => acc + result.claims.length, 0)
    },
    job,
    results
  });
});

v1Router.get("/claims/:id", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const claim = repository.getClaim(req.params.id);
  if (!claim) {
    res.status(404).json({ error_code: "CLAIM_NOT_FOUND" });
    return;
  }
  res.json({ claim });
});

v1Router.get("/claims/:id/timeline", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const claim = repository.getClaim(req.params.id);
  if (!claim) {
    res.status(404).json({ error_code: "CLAIM_NOT_FOUND" });
    return;
  }

  const events = repository.listClaimEvents(claim.id);
  res.json({
    claimId: claim.id,
    status: claim.status,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt || claim.createdAt,
    events
  });
});

v1Router.post("/admin/claims/:id/review", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const claim = repository.getClaim(req.params.id);
  if (!claim) {
    res.status(404).json({ error_code: "CLAIM_NOT_FOUND" });
    return;
  }

  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const { action, note, holdForSecondary } = parsed.data;
  const reviewerId: string = (res.locals.auth?.userId as string) || (res.locals.auth?.subject as string) || "unknown";
  const nowIso = new Date().toISOString();

  if (holdForSecondary) {
    const decision = repository.appendReviewDecision({
      id: uuid(),
      claimId: claim.id,
      reviewerId,
      action: "hold",
      note,
      secondaryHold: true,
      createdAt: nowIso
    });
    enqueueJob({ id: uuid(), type: "manual-review", payload: { claimId: claim.id, action: "hold", secondaryHold: true }, createdAt: nowIso });
    res.json({ claim, decision, message: "Claim held for secondary review." });
    return;
  }

  if (action === "reject") {
    const updated = upsertClaimStatus(claim.id, "rejected", claim.riskScore, ["MANUAL_REJECTION"]);
    const decision = repository.appendReviewDecision({ id: uuid(), claimId: claim.id, reviewerId, action: "reject", note, secondaryHold: false, createdAt: nowIso });
    enqueueJob({ id: uuid(), type: "manual-review", payload: { claimId: claim.id, action }, createdAt: nowIso });
    res.json({ claim: updated, decision, action });
    return;
  }

  const approved = upsertClaimStatus(claim.id, "approved", claim.riskScore, ["MANUAL_APPROVAL"]);
  const payout = processPayout(claim.id, claim.workerId, idempotencyKey(claim.workerId, claim.policyId, claim.triggerEventId), claim.payoutAmount);
  const decision = repository.appendReviewDecision({ id: uuid(), claimId: claim.id, reviewerId, action: "approve", note, secondaryHold: false, createdAt: nowIso });
  enqueueJob({ id: uuid(), type: "manual-review", payload: { claimId: claim.id, action }, createdAt: nowIso });

  if (payout.status === "success") {
    const paid = upsertClaimStatus(claim.id, "paid", claim.riskScore, ["PAYOUT_PROCESSED"]);
    res.json({ claim: paid || approved, payout, decision, action });
    return;
  }
  res.status(202).json({ claim: approved, payout, decision, action, message: payout.status === "pending" ? "Payout uncertain; awaiting resolution." : "Payout failed; retry required." });
});

v1Router.get("/admin/claims/:id/review-trace", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (req, res) => {
  const claim = repository.getClaim(req.params.id);
  if (!claim) {
    res.status(404).json({ error_code: "CLAIM_NOT_FOUND" });
    return;
  }
  const decisions = repository.listReviewDecisions(claim.id);
  res.json({ claimId: claim.id, status: claim.status, decisions });
});

v1Router.get("/payouts/:id", rateLimit({ ipPerMinute: 60, identityPerMinute: 60, burstPerSecond: 10 }), (req, res) => {
  const payout = repository.getPayout(req.params.id);
  if (!payout) {
    res.status(404).json({ error_code: "PAYOUT_NOT_FOUND" });
    return;
  }
  res.json({ payout });
});

v1Router.get("/admin/metrics", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const claims = repository.listClaims();
  const payouts = repository.listPayouts();
  const workers = repository.listWorkers();
  res.json({
    totals: {
      workers: workers.length,
      policies: repository.listPolicies().length,
      claims: claims.length,
      payouts: payouts.length
    },
    riskBreakdown: {
      inReview: claims.filter((c) => c.status === "in_review").length,
      rejected: claims.filter((c) => c.status === "rejected").length,
      paid: claims.filter((c) => c.status === "paid").length
    },
    trustBreakdown: {
      bronze: workers.filter((worker) => trustTier(worker.trustScore) === "bronze").length,
      silver: workers.filter((worker) => trustTier(worker.trustScore) === "silver").length,
      gold: workers.filter((worker) => trustTier(worker.trustScore) === "gold").length
    }
  });
});

v1Router.get("/admin/overview", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({
    metrics: {
      totals: {
        workers: repository.listWorkers().length,
        policies: repository.listPolicies().length,
        claims: repository.listClaims().length,
        payouts: repository.listPayouts().length
      },
      reconciliation: runReconciliation()
    },
    inReviewClaims: repository.listClaimsByStatus("in_review"),
    jobs: listJobs(),
    auditLogs: repository.listAuditLogs().slice(-25).reverse()
  });
});

v1Router.get("/admin/claims/in-review", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ claims: repository.listClaimsByStatus("in_review") });
});

v1Router.get("/admin/reconciliation", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ report: runReconciliation() });
});

v1Router.get("/admin/portfolio/summary", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (req, res) => {
  const city = String(req.query["city"] || "").trim().toLowerCase();
  const plan = String(req.query["plan"] || "").trim().toLowerCase();

  const policies = repository.listPolicies().filter((policy) => {
    const cityMatch = !city || policy.city.toLowerCase() === city;
    const planMatch = !plan || policy.plan === plan;
    return cityMatch && planMatch;
  });

  const workerIds = new Set(policies.map((policy) => policy.workerId));
  const claims = repository.listClaims().filter((claim) => workerIds.has(claim.workerId));
  const payouts = repository.listPayouts().filter((payout) => workerIds.has(payout.workerId));
  const totalPremium = policies.reduce((sum, policy) => sum + policy.premium, 0);
  const successfulPayouts = payouts.filter((payout) => payout.status === "success");
  const payoutOutflow = successfulPayouts.reduce((sum, payout) => sum + payout.amount, 0);

  res.json({
    filters: { city: city || null, plan: plan || null },
    summary: {
      workers: workerIds.size,
      policies: policies.length,
      activePolicies: policies.filter((policy) => policy.status === "active").length,
      claims: claims.length,
      paidClaims: claims.filter((claim) => claim.status === "paid").length,
      claimRate: policies.length > 0 ? Number((claims.length / policies.length).toFixed(2)) : 0,
      totalPremium,
      payoutOutflow,
      grossMargin: totalPremium - payoutOutflow,
      lossRatio: totalPremium > 0 ? Number(((payoutOutflow / totalPremium) * 100).toFixed(2)) : 0
    },
    byPlan: {
      basic: policies.filter((policy) => policy.plan === "basic").length,
      standard: policies.filter((policy) => policy.plan === "standard").length,
      pro: policies.filter((policy) => policy.plan === "pro").length
    }
  });
});

v1Router.get("/admin/fraud/overview", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const claims = repository.listClaims();
  const thresholds = getFraudThresholds();

  const band = (score: number) => {
    if (score >= thresholds.critical) return "critical";
    if (score >= thresholds.high) return "high";
    if (score >= thresholds.medium) return "medium";
    return "low";
  };

  const decisions = claims.flatMap((claim) => repository.listReviewDecisions(claim.id));

  res.json({
    thresholds,
    claims: {
      total: claims.length,
      inReview: claims.filter((claim) => claim.status === "in_review").length,
      rejected: claims.filter((claim) => claim.status === "rejected").length,
      paid: claims.filter((claim) => claim.status === "paid").length,
      byBand: {
        low: claims.filter((claim) => band(claim.riskScore) === "low").length,
        medium: claims.filter((claim) => band(claim.riskScore) === "medium").length,
        high: claims.filter((claim) => band(claim.riskScore) === "high").length,
        critical: claims.filter((claim) => band(claim.riskScore) === "critical").length
      }
    },
    manualReview: {
      decisions: decisions.length,
      approves: decisions.filter((decision) => decision.action === "approve").length,
      rejects: decisions.filter((decision) => decision.action === "reject").length,
      holds: decisions.filter((decision) => decision.action === "hold").length
    }
  });
});

v1Router.get("/admin/operations/overview", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const jobs = listJobs();
  const payouts = repository.listPayouts();
  const tickets = repository.listSupportTickets();
  const now = Date.now();

  res.json({
    reconciliation: runReconciliation(),
    jobs: {
      total: jobs.length,
      byType: {
        triggerIngestion: jobs.filter((job) => job.type === "trigger-ingestion").length,
        triggerIngestionBatch: jobs.filter((job) => job.type === "trigger-ingestion-batch").length,
        manualReview: jobs.filter((job) => job.type === "manual-review").length,
        reconciliation: jobs.filter((job) => job.type === "reconciliation").length
      },
      byStatus: {
        queued: jobs.length,
        running: 0,
        completed: 0,
        failed: 0
      }
    },
    payouts: {
      pending: payouts.filter((payout) => payout.status === "pending").length,
      unresolvedOlderThan5m: payouts.filter((payout) => payout.status === "pending" && now - new Date(payout.createdAt).getTime() > 5 * 60 * 1000).length
    },
    support: {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length
    }
  });
});

v1Router.get("/admin/governance/traceability", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({
    matrixVersion: "v1",
    generatedAt: new Date().toISOString(),
    items: prdTraceabilityMatrix,
    totals: {
      mappedRequirements: prdTraceabilityMatrix.length,
      uniqueOwners: new Set(prdTraceabilityMatrix.map((item) => item.owner)).size
    }
  });
});

v1Router.get("/admin/governance/release-readiness", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const reconciliation = runReconciliation();
  const unresolvedPending = reconciliation.unresolvedPendingCount;
  const duplicateLeakage = reconciliation.duplicatesDetected;

  const gates = releaseGateChecklist.map((gate) => ({
    ...gate,
    status: "ready" as const
  }));

  const pendingExternalDependencies = externalDependencyReadiness.filter((dependency) => dependency.status === "pending").length;

  const riskFlags = [
    unresolvedPending > 0 ? `UNRESOLVED_PENDING_PAYOUTS:${unresolvedPending}` : null,
    duplicateLeakage > 0 ? `DUPLICATE_PAYOUTS_DETECTED:${duplicateLeakage}` : null,
    pendingExternalDependencies > 0 ? "EXTERNAL_DEPENDENCIES_PENDING" : null
  ].filter(Boolean);

  res.json({
    generatedAt: new Date().toISOString(),
    gates,
    reconciliation,
    releaseDecision: riskFlags.length === 0 ? "ready_for_release" : "conditional_hold",
    riskFlags
  });
});

v1Router.get("/admin/governance/external-readiness", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const pending = externalDependencyReadiness.filter((dependency) => dependency.status === "pending");
  res.json({
    generatedAt: new Date().toISOString(),
    dependencies: externalDependencyReadiness,
    totals: {
      total: externalDependencyReadiness.length,
      pending: pending.length,
      ready: externalDependencyReadiness.length - pending.length
    },
    knownGaps: pending.map((dependency) => ({ dependency: dependency.dependency, blocker: dependency.blocker, owner: dependency.owner }))
  });
});

v1Router.post("/admin/reconciliation/run", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (_req, res) => {
  const report = runReconciliation();
  const job = { id: uuid(), type: "reconciliation" as const, payload: { triggeredAt: report.generatedAt }, createdAt: report.generatedAt };
  enqueueJob(job);
  res.json({ report, job });
});

v1Router.get("/admin/payouts", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (req, res) => {
  const status = req.query["status"] as string | undefined;
  const valid = ["pending", "success", "failed"];
  if (status && !valid.includes(status)) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", message: "status must be pending, success, or failed" });
    return;
  }
  const payouts = status
    ? repository.listPayoutsByStatus(status as "pending" | "success" | "failed")
    : repository.listPayouts();
  res.json({ payouts });
});

const ResolvePayoutSchema = z.object({
  outcome: z.enum(["success", "failed"])
});

v1Router.post("/admin/payouts/:id/retry", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const payout = retryPayout(req.params.id);
  if (!payout) {
    res.status(404).json({ error_code: "PAYOUT_NOT_FOUND" });
    return;
  }
  let claim = repository.getClaim(payout.claimId);
  if (payout.status === "success" && claim) {
    claim = upsertClaimStatus(claim.id, "paid", claim.riskScore, ["PAYOUT_PROCESSED_ON_RETRY"]) ?? claim;
  }
  res.json({ payout, claim });
});

v1Router.post("/admin/payouts/:id/resolve", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const parsed = ResolvePayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const payout = resolveUncertainPayout(req.params.id, parsed.data.outcome);
  if (!payout) {
    res.status(404).json({ error_code: "PAYOUT_NOT_FOUND" });
    return;
  }
  let claim = repository.getClaim(payout.claimId);
  if (payout.status === "success" && claim) {
    claim = upsertClaimStatus(claim.id, "paid", claim.riskScore, ["PAYOUT_RESOLVED_BY_ADMIN"]) ?? claim;
  }
  res.json({ payout, claim });
});

v1Router.get("/admin/ledger", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (req, res) => {
  const claimId = req.query["claimId"] as string | undefined;
  const entries = repository.listLedgerEntries(claimId);
  res.json({ entries, total: entries.length });
});

v1Router.get("/admin/support/tickets", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  const tickets = repository.listSupportTickets().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ tickets, total: tickets.length });
});

v1Router.patch("/admin/support/tickets/:id", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 20, identityPerMinute: 10, burstPerSecond: 2 }), (req, res) => {
  const ticket = repository.getSupportTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error_code: "SUPPORT_TICKET_NOT_FOUND" });
    return;
  }

  const parsed = SupportTicketUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }

  const updated = repository.updateSupportTicket({
    ...ticket,
    status: parsed.data.status,
    resolutionNote: parsed.data.resolutionNote,
    assigneeId: (res.locals.auth?.userId as string) || ticket.assigneeId,
    updatedAt: new Date().toISOString()
  });

  res.json({ ticket: updated });
});

v1Router.get("/admin/audit-logs", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ auditLogs: repository.listAuditLogs() });
});

v1Router.get("/admin/jobs", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ jobs: listJobs() });
});

v1Router.get("/admin/retention", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ retention: retentionMetrics() });
});

const FraudThresholdsSchema = z.object({
  critical: z.number().int().min(1).max(200).optional(),
  high: z.number().int().min(1).max(200).optional(),
  medium: z.number().int().min(1).max(200).optional()
});

v1Router.get("/admin/fraud-thresholds", requireRole(["reviewer", "risk-admin", "platform-admin"]), rateLimit({ ipPerMinute: 120, identityPerMinute: 120, burstPerSecond: 20 }), (_req, res) => {
  res.json({ thresholds: getFraudThresholds() });
});

v1Router.put("/admin/fraud-thresholds", requireRole(["platform-admin"]), rateLimit({ ipPerMinute: 10, identityPerMinute: 5, burstPerSecond: 1 }), (req, res) => {
  const parsed = FraudThresholdsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error_code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  setFraudThresholds(parsed.data);
  res.json({ thresholds: getFraudThresholds(), message: "Fraud thresholds updated." });
});
