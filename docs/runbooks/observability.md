# Observability Runbook

## Purpose

Define baseline telemetry checks for Suraksha Weekly reliability drills and incident triage.

## Core Signals

1. Probe health:
- `GET /internal/live`
- `GET /internal/ready`
- `GET /internal/startup`

2. Request telemetry:
- `GET /internal/metrics`
- Key fields:
  - `metrics.totalRequests`
  - `metrics.totalErrors`
  - `metrics.averageLatencyMs`
  - `metrics.maxLatencyMs`
  - `metrics.statuses`

3. Financial safety:
- `GET /api/v1/admin/reconciliation`
- `GET /api/v1/admin/operations/overview`

4. Queue and workload:
- `GET /api/v1/admin/jobs`
- `GET /api/v1/admin/support/tickets`

## SLO Guardrails (MVP)

1. p95 latency for read flows: less than 400 ms.
2. Error rate: less than 1% sustained over 3 minutes.
3. Pending payout backlog older than 5 minutes: zero in normal mode.
4. Duplicate payout leakage: zero in reconciliation reports.

## Triage Sequence

1. Confirm probe health (`live`, `ready`, `startup`).
2. Pull `internal/metrics` snapshot and compare error and latency deltas.
3. Check operations overview for payout backlog and support pressure.
4. Run reconciliation and verify mismatch and unresolved pending counts.
5. If thresholds are breached, follow deployment rollback runbook.

## Incident Evidence Capture

Collect and attach:
- Probe responses with timestamps.
- `internal/metrics` payload snapshots before and after mitigation.
- `admin/reconciliation` and `admin/operations/overview` payloads.
- Last 50 audit records from `admin/audit-logs`.

## Review Cadence

1. Daily: probe and metrics smoke checks.
2. Weekly: reconciliation drift and support backlog review.
3. Release day: run full Phase 9 test pack and k6 smoke scenarios.
