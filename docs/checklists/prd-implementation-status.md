# PRD Implementation Status

## Current Build Coverage

- API v1 scaffolding: done
- Health probes (`/internal/live`, `/internal/ready`, `/internal/startup`): done
- Rate limiting middleware: done
- OTP request and verification flow: done
- Session lifecycle baseline (worker/admin login, refresh, logout, me): done
- Role-aware admin authorization baseline: done
- Worker profile read/update endpoints: done
- Worker onboarding upsert and risk-profile CRUD: done
- Underwriting rules and risk segments: done
- Pricing and trust components: done
- Premium floor/ceiling guardrails and explainability breakdown: done
- Claim + fraud + payout orchestration: done
- Claim exposure-window enforcement and duplicate-window controls: done
- Claim burst-pattern hold-and-review controls: done
- Claim lifecycle event timeline endpoint: done
- Policy lifecycle view, renew, and cancel routes: done
- Policy purchase overlap prevention and lifecycle enrichment: done
- Policy reminders schedule/list/send routes: done
- Admin lapse-run and retention metrics routes: done
- Manual review queue route: done
- Trigger ingestion route with auto-initiated claim routing: done
- Trigger source normalization and confidence intelligence: done
- Batch trigger ingestion with degraded-mode summary: done
- Mock weather/AQI signal adapters with fallback metadata: done
- Fraud scoring expansion: account age, trust tier, velocity (24h/7d), linked-identity cluster, trigger saturation: done
- FraudContext velocity and identity context built per-request and passed to scorer: done
- Fraud score thresholds configurable via store (default: 80/55/30): done
- GET /admin/fraud-thresholds endpoint (reviewer+): done
- PUT /admin/fraud-thresholds endpoint (platform-admin only): done
- ReviewDecision model with note, secondaryHold, and reviewerId fields: done
- POST /admin/claims/:id/review now records decision trace with note and secondary-hold support: done
- GET /admin/claims/:id/review-trace endpoint: done
- Reconciliation service and endpoint: done
- Repository abstraction with audit logging: done
- Database-ready schema and seed SQL: done
- CI workflow scaffold: done
- k6 load-test scaffold: done
- Docker packaging and deployment runbook: done
- Worker/admin web flows and action wiring: done
- Coverage terms and glossary content surfaces: done
- Worker timeline and payout estimator APIs: done
- Trigger explanation catalog content endpoint: done
- Support ticket workflow surfaces for worker/admin: done
- Admin portfolio, fraud, and operations overview APIs: done
- Internal observability metrics endpoint and telemetry aggregation: done
- Dedicated contract, E2E, and red-team test suites: done
- Phase-9 reliability command pack and k6 resilience scaffolds: done
- Observability and reliability drill runbooks: done
- Governance endpoints for traceability, release-readiness, and external dependency readiness: done
- Requirement traceability matrix and PRD-to-test-to-metric mapping artifacts: done
- Release gate checklist and owner mapping artifact: done
- External dependency readiness pack and known-gap register: done

## Verified During This Build Pass

- TypeScript build: passing
- Service tests: passing
- Extended integration tests for OTP, renewal/cancel, duplicate claims, and trigger automation: passing
- Integration tests for onboarding upsert, risk-profile CRUD, and coverage content: passing
- Integration tests for premium guardrails, policy reminders, lifecycle listing, and admin retention metrics: passing
- Integration tests for trigger normalization, batch ingestion, and degraded-mode handling: passing
- Integration tests for claim exposure windows, burst moderation, and claim timeline lifecycle: passing
- Integration tests for expanded fraud rules, review decision trace, and threshold governance: passing
- Integration tests for worker timeline, payout estimator, trigger explanations, support ticket flow, and admin advanced dashboard views: passing
- Contract tests for probe, estimator, trigger explanation, and rate-limit response contracts: passing
- E2E journey tests for worker-to-admin payout lifecycle and operational checks: passing
- Red-team tests for internal auth abuse, role boundary abuse, token replay, OTP brute-force containment, and duplicate payout containment: passing
- Governance integration tests for traceability, release-readiness, external readiness, and role enforcement: passing
- Health endpoint smoke test: passing
- Worker registration and quote smoke test: passing
- Claim payout and reconciliation smoke test: passing
- Trigger ingestion smoke test: passing
- Worker and admin portal HTTP smoke test: passing
- Request correlation header baseline: passing

## Remaining Manual Or External Integrations

- Real PostgreSQL wiring using `DATABASE_URL`
- Redis and queue broker connection wiring using user-provided connection strings
- Payment sandbox credentials and callback validation secrets
- Real external API keys for weather and AQI providers
- Staging/production environment deployment infrastructure and secret injection
- Legal/compliance approved external content and partner-specific contracts

## Important Constraint

This repository now covers the local MVP workflow and major PRD-backed controls that can be implemented without external credentials or infrastructure. Sections that depend on regulated operations, real vendors, staging infrastructure, production secrets, legal approvals, insurance partnerships, or human governance remain external completion items by design and cannot be fully operationalized from source code alone.

## Validation Note

This file represents the implemented baseline versus manual/external dependencies still required for full environment promotion.
