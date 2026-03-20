# Requirement Traceability Matrix (Phase 10)

## Scope

This matrix ties PRD requirements to implemented APIs, tests, and operational metrics.

## Mapping

| PRD Requirement | Requirement Summary | API Surface | Test Evidence | Metric Evidence | Owner |
|---|---|---|---|---|---|
| FR-1 | OTP auth and profile CRUD | /api/v1/auth/otp/*, /api/v1/workers/*/profile, /api/v1/workers/*/risk-profile | v1.integration.test.ts (OTP + profile CRUD) | onboarding_completion_rate, otp_success_rate | Auth & Onboarding |
| FR-2 | Weekly policy lifecycle | /api/v1/policies/*, /api/v1/workers/:id/policies | v1.integration.test.ts (renew/cancel/reminders) | renewal_rate, active_policy_count | Policy |
| FR-3 | Dynamic premium and explainability | /api/v1/policies/quote, /api/v1/plans | v1.integration.test.ts, pricingService.test.ts | quote_latency_ms, quote_conversion_rate | Pricing |
| FR-4 | Trigger monitoring and normalized ingestion | /api/v1/triggers/ingest, /api/v1/triggers/ingest/batch | v1.integration.test.ts (trigger + batch degraded mode) | trigger_freshness_minutes, degraded_mode_rate | Trigger Intelligence |
| FR-5 | Claim automation and moderation | /api/v1/claims/initiate, /api/v1/claims/:id/timeline, /api/v1/admin/claims/:id/review | v1.integration.test.ts (exposure window, burst hold, review trace) | claim_automation_rate, in_review_backlog | Claims |
| FR-6 | Fraud scoring and review governance | /api/v1/admin/fraud-thresholds, /api/v1/admin/fraud/overview | v1.integration.test.ts, v1.redteam.test.ts | fraud_false_negative_rate, fraud_leakage_rate | Fraud Ops |
| FR-7 | Payout integrity and uncertain-state handling | /api/v1/admin/payouts/*, /api/v1/admin/ledger | v1.integration.test.ts (pending resolve, retry flow) | trigger_to_payout_minutes, duplicate_payout_leakage | Payout Ops |
| FR-8 | Worker and admin dashboards | /api/v1/workers/:id/dashboard, /api/v1/admin/overview, /api/v1/admin/portfolio/summary | v1.integration.test.ts | dashboard_freshness_minutes, portfolio_claim_rate | Product Analytics |
| FR-9 | Audit and traceability | /api/v1/admin/audit-logs, /api/v1/admin/governance/*, /internal/metrics | v1.contract.test.ts, v1.e2e.test.ts, v1.integration.test.ts | audit_coverage_ratio, release_gate_pass_rate | Platform Governance |

## Verification Commands

- npm run build
- npm run test
- npm run test:phase9
