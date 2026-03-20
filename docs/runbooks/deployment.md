# Deployment Runbook

## Promotion Path

`feature/* -> develop -> staging -> main`

## Pre-Deploy Checks

1. Build succeeds.
2. Unit and service tests succeed.
3. Staging smoke tests succeed.
4. Rollback image tag is available.

## Rollback Conditions

1. Error rate above 1% for 3 minutes.
2. P95 latency more than double threshold for 5 minutes.
3. Unexpected payout processing failure.

## Rollback Procedure

1. Stop promotion.
2. Redeploy previous tagged image.
3. Verify readiness probes.
4. Verify payout and admin metrics endpoints.
5. Open post-incident report.

## Phase 9 Reliability Gate

1. Run `npm run test:phase9 -w apps/api`.
2. Run `k6 run k6/load-test.js` against target environment.
3. Verify observability checklist from `docs/runbooks/observability.md`.
4. Execute rollback drill checklist from `docs/runbooks/reliability-drills.md`.
