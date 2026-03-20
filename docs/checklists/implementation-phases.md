# 10-Phase Execution Plan

## Phase 1 - Foundation And Access

Status: complete

Todos:
- Define 10-phase execution map from PRD Sections 1-55.
- Harden configuration and manual-input awareness for local and promoted environments.
- Add request correlation baseline and standard 404 handling.
- Add session lifecycle baseline: worker OTP session, admin login session, refresh, logout, me.
- Add role baseline: worker, reviewer, risk-admin, platform-admin.
- Protect admin APIs with role-aware authorization.
- Wire worker and admin web apps to API-backed auth.
- Add Phase 1 integration tests.
- Update status documentation.

Completed outcomes:
- Config baseline expanded for auth and manual environment inputs.
- Request correlation header and 404 baseline added.
- Worker OTP verification now issues sessions.
- Admin login, refresh, logout, and me endpoints added.
- Admin APIs now require authorized admin roles.
- Worker and admin web apps now use API-backed auth tokens.
- Build, integration tests, and live smoke checks passed.

## Phase 2 - Worker Onboarding And Profile

Status: complete

Scope:
- Full worker risk-profile CRUD.
- Better onboarding completeness and validation.
- Coverage terms visibility and policy glossary surfaces.
- Worker dashboard baseline alignment with PRD FR-1 and FR-8.

Completed outcomes:
- RiskProfile model and in-memory persistence added.
- Onboarding upsert flow added with validation and completeness scoring.
- Risk-profile GET, PUT, and DELETE endpoints added.
- Worker profile endpoint now returns risk-profile and completeness state.
- Worker dashboard now returns protected-earnings and covered-hours summary data.
- Coverage terms and policy glossary content endpoints added.
- Worker portal now uses API-backed onboarding and profile deletion.
- Phase 2 build and integration tests passed.

## Phase 3 - Policy Lifecycle And Pricing

Status: complete

Scope:
- Quote, purchase, renew, cancel, lapse, reminders.
- Premium floor and ceiling guardrails.
- Explainability output and plan packaging refinement.
- Weekly renewal and retention instrumentation.

Completed outcomes:
- Premium floor and ceiling guardrails added with quote explainability breakdown.
- Purchase flow hardened to block overlapping active policies.
- Policy terms added to quote, purchase, and policy detail responses.
- Lifecycle enrichment added for worker and portfolio policy listings.
- Reminder scheduling, listing, and send endpoints added.
- Manual lapse run endpoint added for admin roles.
- Retention event tracking and admin retention metrics endpoint added.
- Phase 3 integration tests added and passing.

## Phase 4 - Trigger Ingestion And Confidence

Status: complete

Scope:
- Multi-trigger support expansion.
- Trigger source normalization and confidence scoring.
- Mock weather and AQI adapters with fallback behavior.
- Audit snapshots and degraded-mode handling.

Completed outcomes:
- Trigger intelligence service added for source normalization and confidence derivation.
- Trigger source expansion added: weather, aqi, platform, manual, synthetic.
- Mock weather and AQI signal adapters added with deterministic confidence snapshots.
- Trigger ingestion endpoint now returns intelligence metadata and normalized trigger type.
- Batch trigger ingestion endpoint added with per-event claims and degraded-mode summary.
- Audit snapshots now include adapter, source confidence, and degradation indicators.
- Integration coverage added for normalized ingestion and batch degraded-mode behavior.
- Phase 4 build and integration tests passed.

## Phase 5 - Claim Orchestration And Moderation

Status: complete

Scope:
- Event-driven claim pipeline refinement.
- Exposure-window checks, waiting periods, anti-duplication.
- Burst controls and hold-and-review routing.
- Claim explanations and lifecycle completeness.

Completed outcomes:
- Claim lifecycle metadata and event timeline model added.
- Claim service now records event history for initiation and each status transition.
- Exposure-window guard added to claim initiation to block out-of-window requests.
- Recent duplicate-window control added to reduce rapid repeat claim submissions.
- Burst-pattern control added to auto-route suspicious surges to hold-and-review.
- Manual claim API responses now include structured decision explanations.
- Claim timeline endpoint added: GET /api/v1/claims/:id/timeline.
- Integration coverage added for exposure-window enforcement, burst controls, and lifecycle timeline.
- Phase 5 build and integration tests passed.

## Phase 6 - Fraud And Manual Review Controls

Status: complete

Scope:
- Deterministic fraud rules expansion.
- Linked-identity and velocity baselines.
- Manual review workflow and decision trace hardening.
- Threshold governance scaffolding.

Completed outcomes:
- Fraud scoring expanded with account-age, trust-score tier, velocity (24h/7d), linked-identity cluster, and trigger-saturation rules.
- FraudContext interface added; scoreFraud now accepts optional velocity and identity context from the route layer.
- Fraud thresholds moved from hardcoded constants to mutable store object (default: critical=80, high=55, medium=30).
- GET /admin/fraud-thresholds added — accessible to reviewer, risk-admin, platform-admin.
- PUT /admin/fraud-thresholds added — platform-admin only; validates and applies new thresholds.
- ReviewDecision model and reviewDecisions store map added for persistent decision trace.
- POST /admin/claims/:id/review now accepts note and holdForSecondary fields; records ReviewDecision after each action.
- GET /admin/claims/:id/review-trace added — returns full ordered decision history for a claim.
- Claim initiation route now builds FraudContext (claimsLast24h, claimsLast7d, linkedIdentityMatches, triggerClaimCount) before fraud scoring.
- Integration tests added: expanded fraud rules validation, review trace with secondary hold, and threshold governance role enforcement.
- Phase 6 build and integration tests passed (24/24).

## Phase 7 - Payout, Ledger, And Reconciliation

Status: complete
Scope:

Completed outcomes:
- PayoutTransaction extended with adapter, failureReason, retryCount, createdAt, and resolvedAt fields.
- LedgerEntry interface added for audit-first payout integrity.
- Ledger store and repository methods added (createLedgerEntry, updateLedgerEntry, getLedgerEntry, findLedgerEntryByPayoutId, listLedgerEntries).
- Repository extended with updatePayout, findPayoutByClaim, listPayoutsByStatus.
- payoutService rewritten with PayoutAdapterMode (success/pending/fail), ledger-first processPayout, retryPayout, and resolveUncertainPayout.
- reconciliationService enhanced with pendingPayouts, unresolvedPendingCount, claimPayoutMismatches, and ledger stats.
- triggerService updated to return payout_pending and payout_failed outcomes.
- v1.ts: claim initiation and admin review approve respond 202 on non-success payout.
- v1.ts: POST /admin/reconciliation/run, GET /admin/payouts, POST /admin/payouts/:id/retry, POST /admin/payouts/:id/resolve, GET /admin/ledger added.
- Phase 7 build and integration tests passed (27/27).

## Phase 8 - UX, Transparency, And Dashboards

Status: complete

Scope:
- Worker timeline, payout estimator, trigger explanations.
- Admin portfolio, fraud, and operational views.
- Better policy transparency and support workflow surfaces.
- Demo-ready user journeys.

Completed outcomes:
- Worker timeline endpoint added: GET /workers/:id/timeline with policy, claim, payout, reminder, and support activity feed.
- Worker payout estimator endpoint added: POST /workers/:id/payout-estimator with transparent formula and confidence hint.
- Trigger explanation content endpoint added: GET /content/trigger-explanations.
- Support workflow endpoints added: POST /workers/:id/support/tickets, GET /workers/:id/support/tickets, GET /admin/support/tickets, PATCH /admin/support/tickets/:id.
- Admin portfolio and risk visibility endpoints added: GET /admin/portfolio/summary and GET /admin/fraud/overview.
- Admin operations visibility endpoint added: GET /admin/operations/overview (reconciliation, jobs, payout backlog, support backlog).
- Worker web app wired to API-backed timeline, payout estimator pre-check, trigger explanations, and support ticket creation.
- Admin web app wired to API-backed portfolio summary, fraud overview, and operations snapshot surfaces.
- Phase 8 build and integration tests passed (29/29).

## Phase 9 - Reliability, Testing, And Operations

Status: complete

Scope:
- Contract tests, E2E tests, red-team scenarios.
- Load, resilience, and rollback drill scaffolds.
- Probe and rate-limit validation depth.
- Runbook and observability refinements.

Completed outcomes:
- Internal observability service added with request counters, method/status breakdown, latency summary, and route activity.
- App middleware now records per-request latency and status metrics for operational snapshots.
- Internal probe contracts expanded and standardized with service/version metadata and dependency mode reporting.
- New telemetry endpoint added: GET /internal/metrics.
- Dedicated contract suite added: src/routes/v1.contract.test.ts.
- Dedicated end-to-end journey suite added: src/routes/v1.e2e.test.ts.
- Dedicated red-team suite added: src/routes/v1.redteam.test.ts.
- New scripts added for focused execution: test:contract, test:e2e, test:redteam, and test:phase9.
- k6 scaffold upgraded with probe baseline, worker flow smoke, rate-limit stress, rollback readiness smoke, and degraded resilience smoke scenarios.
- Runbooks expanded with observability and reliability drill playbooks.
- Phase 9 reliability suite and regression validation passed.

## Phase 10 - Governance, Traceability, And Release Readiness

Status: complete

Scope:
- Requirement traceability matrix.
- PRD-to-test-to-metric mapping.
- Release gate checklists and owner mapping.
- External dependency readiness pack and known-gap register.

Completed outcomes:
- Governance endpoints added: GET /api/v1/admin/governance/traceability, GET /api/v1/admin/governance/release-readiness, GET /api/v1/admin/governance/external-readiness.
- Requirement traceability matrix documented in docs/checklists/requirement-traceability-matrix.md.
- PRD-to-test-to-metric mapping documented in docs/checklists/prd-test-metric-mapping.md.
- Release gate checklist and owner matrix documented in docs/checklists/release-gate-checklist.md.
- External dependency readiness pack and known-gap register documented in docs/checklists/external-readiness-pack.md.
- Integration tests added for governance endpoints and role enforcement.
- Admin portal jobs rendering hardened for queue entries without explicit status field.
- Build and full automated test suite passed after governance changes.