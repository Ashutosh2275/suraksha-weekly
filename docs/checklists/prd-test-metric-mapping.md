# PRD-to-Test-to-Metric Mapping (Phase 10)

## Goal

Provide a release-ready mapping from PRD objectives to executable tests and measurable outcomes.

## Objective Mapping

| PRD Objective | Test Suites | Runtime Signals |
|---|---|---|
| Onboarding completion >= 70% | v1.integration.test.ts (onboarding profile CRUD) | onboarding_completion_rate |
| Weekly renewal >= 55% by week 6 | v1.integration.test.ts (renew, reminders, retention) | weekly_renewal_rate |
| Trigger-to-payout <= 10m | v1.integration.test.ts (auto pay, pending/resolve, retry) | trigger_to_payout_minutes |
| Fraud FN < 5% and leakage 0% | v1.integration.test.ts (fraud + thresholds), v1.redteam.test.ts | fraud_false_negative_rate, fraud_leakage_rate |
| Claim automation >= 80% | v1.integration.test.ts (trusted trigger auto initiation) | claim_automation_rate |
| Moderate claim incidence band | v1.integration.test.ts + admin metrics checks | claim_incidence_ratio |
| Quote response <= 2s | v1.contract.test.ts + k6 load-test.js | quote_latency_ms_p95 |
| Uptime >= 99% (competition) | v1.contract.test.ts probes + k6 probe traffic | uptime_percent |
| Data freshness <= 5 min | trigger intelligence + operations overview checks | trigger_data_freshness_minutes |

## Test Pack Breakdown

1. Regression/API integration:
- npm run test

2. Reliability and abuse pack:
- npm run test:phase9

3. Load and resilience scaffold:
- k6 run k6/load-test.js

## Evidence Sources

- /internal/metrics
- /api/v1/admin/reconciliation
- /api/v1/admin/operations/overview
- /api/v1/admin/governance/traceability
- /api/v1/admin/governance/release-readiness
