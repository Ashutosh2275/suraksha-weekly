# Backup and Recovery Runbook

## Scope

Applies to Tier 0, Tier 1, and Tier 2 data classes as defined in PRD Section 35.

## Recovery Objectives

- Tier 0: RTO 60m, RPO 5m
- Tier 1: RTO 2h, RPO 15m
- Tier 2: RTO 4h, RPO 1h

## PITR Workflow (Template)

1. Declare incident and capture failure timestamp.
2. Stop write traffic.
3. Restore latest full snapshot to recovery environment.
4. Replay WAL until target timestamp.
5. Validate Tier 0 checksums and counts.
6. Validate no missing approved claims or payouts.
7. Re-enable traffic after sign-off.

## Drill Cadence

- Full restore: monthly
- PITR drill: monthly
- Audit integrity check: weekly
- Cross-region failover: quarterly

## Phase 9 Alignment

1. Pair each monthly PITR drill with `npm run test:phase9 -w apps/api`.
2. Capture probe and telemetry snapshots via `/internal/live`, `/internal/ready`, and `/internal/metrics` before and after recovery.
3. Record reconciliation state (`/api/v1/admin/reconciliation`) post-recovery to verify payout integrity.
4. Store all artifacts using the evidence checklist in `docs/runbooks/observability.md`.
