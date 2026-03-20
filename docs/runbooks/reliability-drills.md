# Reliability Drill Runbook

## Objective

Run repeatable drills for load, resilience, and rollback readiness before promotion.

## Drill Packs

1. Contract checks:
- `npm run test:contract -w apps/api`

2. End-to-end journey checks:
- `npm run test:e2e -w apps/api`

3. Red-team abuse checks:
- `npm run test:redteam -w apps/api`

4. Combined Phase 9 gate:
- `npm run test:phase9 -w apps/api`

5. Load and resilience scaffold:
- `k6 run k6/load-test.js`

## Mandatory Drill Scenarios

1. Probe continuity during traffic.
2. Rate-limit defense under burst pressure.
3. Worker flow completion under sustained load.
4. Unauthorized internal trigger attempts are blocked.
5. Rollback readiness smoke verifies startup and ready payload contracts.

## Rollback Drill Steps

1. Deploy candidate build to staging.
2. Run `npm run test:phase9 -w apps/api`.
3. Run `k6 run k6/load-test.js` against staging base URL.
4. Trigger rollback to previous image tag.
5. Re-run probe and reconciliation checks.
6. Record timings for recovery and service stability.

## Pass/Fail Criteria

1. All Phase 9 test suites pass.
2. k6 thresholds pass (`p(95)<400`, error rate under 2%).
3. Probe endpoints remain healthy during all scenarios.
4. No duplicate payout leakage observed.
5. Recovery timing meets deployment and backup objectives.

## Post-Drill Actions

1. File drill report with command outputs and timestamps.
2. Update unresolved risks and owner assignments.
3. Capture any flaky tests and create remediation tasks before promotion.
