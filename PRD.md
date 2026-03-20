# Product Requirements Document (PRD)

## 1) Product Overview

### Product Name
Suraksha Weekly: AI Parametric Income Shield for Gig Delivery Partners

### Problem Statement
Platform-based delivery partners in India lose earnings when external disruptions occur (for example: extreme weather, severe pollution, sudden curfews, zone shutdowns). Existing insurance options do not provide fast, automated, income-focused protection for these short-term disruptions.

### Vision
Create a simple, trustworthy, and automated weekly insurance product that protects gig workers from loss of income caused by external events, with near-instant claim initiation and payout.

### Scope Guardrails (Hard Constraints)
1. Cover only loss of income due to external disruptions.
2. Exclude health, life, accidents, and vehicle repair coverage.
3. Weekly premium pricing model is mandatory.

## 2) Personas and Users

### Primary Persona (Worker)
Food delivery partner (for example: Swiggy/Zomato worker in metro city zones)

Attributes:
- Income is variable and strongly weather-dependent.
- Limited time for insurance onboarding.
- Requires clear payout rules and quick money transfer.

### Secondary Persona (Insurer Ops/Admin)
Operations analyst and risk manager at insurer/MGA.

Attributes:
- Needs fraud visibility.
- Monitors loss ratio, claims velocity, and trigger quality.
- Requires tuning controls for premium and payout thresholds.

## 3) Goals and Non-Goals

### Business Goals
1. Increase trust and adoption with low-friction onboarding.
2. Keep combined ratio sustainable via dynamic pricing + fraud controls.
3. Demonstrate phase-wise competition deliverables with measurable outcomes.
4. Maintain moderate claim frequency through calibrated eligibility and trigger thresholds.

### User Goals
1. Buy coverage in under 3 minutes.
2. Know exactly what events trigger compensation.
3. Receive payout quickly without manual paperwork.

### Non-Goals
1. No medical claim processing.
2. No vehicle damage reimbursement.
3. No long-term annual policy products in MVP.

## 4) Success Metrics

### North Star
Protected Income Reliability = percentage of valid disruption events where eligible workers receive payout within target time.

### Primary KPIs
1. Onboarding completion rate >= 70%.
2. Weekly renewal rate >= 55% by week 6.
3. Trigger-to-payout time <= 10 minutes in simulation.
4. Fraud false-negative rate < 5% on simulated fraud set.
5. Claim automation rate >= 80%.
6. Weekly claim incidence maintained in moderate band (target 10% to 18% of active policies, recalibrated by city and season).
7. Fraud payout leakage target = 0% (no confirmed fraudulent claim should be paid in controlled test and demo runs).

### Operational KPIs
1. Quote response time <= 2 seconds.
2. System uptime >= 99.0% (competition environment).
3. Data freshness for weather and disruption feeds <= 5 minutes.

## 5) Core Product Flows

### Flow A: Worker Onboarding
1. Mobile OTP login.
2. Persona details: city, service zones, platform type, average daily online hours, average weekly earnings.
3. Risk profile generated.
4. Weekly plan quote shown.
5. Worker buys policy and receives policy card.

### Flow B: Weekly Pricing and Renewal
1. Risk engine computes weekly premium and coverage amount.
2. Worker confirms and pays.
3. Auto-reminder before expiry.
4. One-tap weekly renewal.

### Flow C: Parametric Trigger and Claim Automation
1. Event engine receives disruption signals (weather/pollution/curfew/zone closure).
2. Trigger evaluator checks threshold conditions for insured zone and time band.
3. Eligible workers are auto-enrolled into claim event.
4. Fraud checks execute.
5. Approved claims move to payout immediately.

### Flow D: Payout
1. Payout amount determined by payout rule and worker baseline earnings.
2. Simulated transfer initiated via sandbox gateway.
3. Worker receives notification and receipt.

## 6) Functional Requirements

### FR-1 Authentication and Profile
1. OTP-based sign-in for workers.
2. Profile CRUD for worker risk inputs.

### FR-2 Policy Management
1. Create, view, renew, and cancel weekly policy.
2. Display coverage terms in plain language.

### FR-3 Dynamic Weekly Premium Engine (AI)
1. Inputs: location risk index, historical disruption frequency, hour-of-day exposure, platform segment.
2. Output: premium and coverage limit per week.
3. Explainability panel: top 3 factors affecting premium.

### FR-4 Trigger Monitoring
1. Poll weather and air quality APIs (or mocks).
2. Support at least 3-5 disruption triggers.
3. Store trigger snapshots for audit trail.

### FR-5 Automated Claim Processing
1. Event-driven claim initiation (no user form required for parametric events).
2. Eligibility engine validates active policy + zone + time overlap.
3. Claim status states: initiated, in_review, approved, rejected, paid.
4. Mandatory moderation rules before approval: waiting period, minimum pre-event exposure window, and anti-duplication checks.

### FR-6 Fraud Detection (AI + Rules)
1. Detect GPS spoofing anomalies.
2. Detect duplicate claims for same worker/event window.
3. Detect impossible activity patterns (for example: unrealistic location jumps).
4. Risk score per claim with human review queue for high-risk cases.
5. Hard-block payout when identity, device, payout destination, or travel plausibility checks fail.
6. Require second-level approval for claims crossing risk and amount thresholds.

### FR-7 Payout System
1. Simulate payout through Razorpay test mode, Stripe sandbox, or UPI simulator.
2. Support instant payout on approved claims.
3. Persist payout confirmation details.

### FR-8 Dashboards
1. Worker dashboard: covered hours, estimated protected earnings, policy status, payout history.
2. Admin dashboard: active policies, claim rate, fraud alerts, loss ratio, trigger heatmap.

### FR-9 Audit and Traceability
1. Immutable event log for policy, triggers, claims, and payouts.
2. Exportable report for demo and judging.
3. Full decision trace for every rejected, delayed, and blocked payout.

## 7) Non-Functional Requirements

1. Performance: p95 API latency < 400 ms for core read flows.
2. Reliability: graceful fallback to mock data if external API fails.
3. Security: encrypt PII at rest and in transit.
4. Privacy: collect minimum required user data.
5. Explainability: show premium and claim decision reasons.
6. Scalability target: 10,000 workers in simulation without architecture change.

## 8) Disruption Triggers (Initial Set)

1. Heavy Rain Trigger
Condition: rainfall >= threshold mm/hour for >= threshold duration in insured zone.

2. Extreme Heat Trigger
Condition: temperature >= threshold for configured time window.

3. Severe Pollution Trigger
Condition: AQI >= severe threshold for sustained interval.

4. Local Restriction Trigger
Condition: zone closure/curfew feed indicates active restriction.

5. Platform Outage Proxy Trigger (optional mock)
Condition: platform downtime signal persists beyond threshold.

## 9) Weekly Pricing and Payout Logic

### Premium Model (MVP)
Weekly Premium = Base Weekly Rate x Risk Multiplier x Exposure Multiplier x Trust Adjustment

Where:
1. Risk Multiplier is derived from disruption frequency and severity.
2. Exposure Multiplier is derived from worker active hours in high-risk windows.
3. Trust Adjustment rewards low fraud-risk behavior over time.

### Payout Model (MVP)
Payout = min(Coverage Cap, Baseline Hourly Earnings x Lost Covered Hours x Trigger Severity Factor)

### Claim Moderation Rules
1. Apply policy waiting period for selected high-risk triggers.
2. Enforce minimum pre-event online exposure to qualify.
3. Cap cumulative weekly payouts to a configurable percentage of verified weekly baseline earnings.
4. Use trigger confidence thresholds to avoid noisy claim spikes.
5. Auto-route abnormal claim bursts to hold-and-review mode.

### Fairness Constraints
1. Premium floor and ceiling to avoid outlier unfairness.
2. Policy terms are transparent and visible before purchase.

## 10) Fraud Strategy

### Fraud Control Objective
1. Operating target: 0% fraud payout leakage.
2. Practical stance: absolute fraud prevention cannot be guaranteed in real-world systems, so controls must prevent, detect, and contain fraud before payout.

### Rule Layer
1. Event deduplication by worker + zone + time window.
2. Velocity checks for multiple payouts in short interval.
3. Device and session consistency checks.
4. Beneficiary account re-use detection across unrelated identities.
5. Time-window and policy-activation abuse checks.

### ML Layer
1. Isolation Forest or equivalent anomaly model for claim behavior.
2. Features include claim timing, location entropy, route plausibility, historical acceptance pattern.
3. Model outputs fraud score and reason tags.
4. Daily drift checks with threshold rollback if model instability is detected.

### Decision Policy
1. Low risk: auto-approve with post-audit sampling.
2. Medium risk: hold-and-verify lane with delayed payout SLA.
3. High risk: mandatory manual review queue.
4. Critical mismatch: auto-block payout and escalate.

## 11) Data Model (High Level)

1. Worker
2. Policy
3. RiskProfile
4. TriggerEvent
5. Claim
6. FraudAssessment
7. PayoutTransaction
8. AuditLog

## 12) System Architecture (MVP)

### Components
1. Worker App/Web Frontend.
2. Admin Dashboard.
3. API Gateway and Auth Service.
4. Pricing and Risk Engine.
5. Trigger Ingestion Service.
6. Claim Orchestration Service.
7. Fraud Scoring Service.
8. Payout Adapter Service.
9. Data Store + Event Log.

### Suggested Stack
1. Frontend: React or Next.js.
2. Backend: Node.js (Nest/Express) or Python (FastAPI).
3. Data: PostgreSQL + Redis.
4. Async: Queue (BullMQ/RabbitMQ).
5. ML: Python microservice (scikit-learn).
6. Infra: Docker + cloud free tier.

## 13) API Integrations

1. Weather API (OpenWeather or equivalent).
2. AQI API (OpenAQ or equivalent).
3. Location services (mock or map provider).
4. Payment sandbox (Razorpay/Stripe/UPI simulator).
5. Optional platform activity feed (mock).

## 14) Competition-Phase Delivery Plan

### Phase 1: Ideation and Foundation
1. Finalize persona and trigger thresholds.
2. Deliver README strategy and prototype screens.
3. Define weekly pricing logic and data contracts.

### Phase 2: Automation and Protection
1. Implement registration and policy workflows.
2. Build dynamic weekly quote engine.
3. Enable claims automation with 3-5 triggers.

### Phase 3: Scale and Optimize
1. Add advanced fraud scoring and manual review queue.
2. Integrate instant payout simulation.
3. Build worker/admin intelligence dashboards.

## 15) Acceptance Criteria (MVP)

1. A worker can buy and renew a weekly policy.
2. At least 3 disruption triggers auto-initiate claims.
3. Fraud engine scores every claim.
4. Approved claims are paid through sandbox adapter.
5. Worker dashboard shows policy and payout history.
6. Admin dashboard shows live claims, fraud flags, and loss metrics.
7. Claim incidence remains within configured moderate band in simulation.
8. Duplicate payout leakage remains zero in all UAT and demo test runs.

## 16) Risks and Mitigations

1. External API downtime.
Mitigation: cached data + mock fallback + health checks.

2. Overfitting fraud model due to small data.
Mitigation: hybrid rule + ML approach and conservative thresholds.

3. User distrust in automated claims.
Mitigation: transparent trigger logs and claim explanation cards.

4. Pricing instability.
Mitigation: premium caps and periodic calibration.

5. Aggressive fraud blocks may reject legitimate claims.
Mitigation: appeal workflow, explainable decisions, and monitored false-positive thresholds.

## 17) Critical Product Decisions and Tradeoffs

1. Parametric first vs manual claims first.
Decision: parametric first for speed and lower ops burden.

2. Broad persona vs focused persona.
Decision: start with food delivery in one metro to improve model accuracy.

3. Full mobile app vs web-first.
Decision: responsive web-first for speed in hackathon timeline.

4. End-to-end AI vs explainable hybrid.
Decision: hybrid rules + ML for controllability and judge clarity.

## 18) Deliverables Produced from This PRD

1. Product scope and requirements baseline.
2. Implementation-ready backlog input.
3. Demo narrative structure for pitch and judging.

## 19) Loophole Closure Framework (Basic and Advanced)

Note: The operating target is 0% fraud payout leakage. In practice, no real-world platform can guarantee absolute zero fraud attempts, so defense-in-depth must ensure fraud is blocked before payout.

### Basic Loopholes and Mandatory Controls

1. Multi-account abuse (same person, multiple profiles).
Controls:
- Enforce phone + device + payout handle uniqueness checks.
- Trigger manual review for identity-link collisions.

2. Duplicate payout attempts for same event.
Controls:
- Use strict idempotency key: worker_id + policy_id + trigger_event_id.
- Enforce unique database constraint on payout transaction tuple.

3. Last-minute policy purchase before forecasted disruption.
Controls:
- Apply waiting period for high-risk triggers (for example 24 hours).
- Disallow retroactive activation windows.

4. Basic GPS spoofing.
Controls:
- Root/emulator detection and app attestation checks.
- Location trust score using GPS + network + movement plausibility.

5. Repeated low-value farming.
Controls:
- Claim velocity caps by user, zone, and device.
- Dynamic cooldown for repeated claims in short windows.

### Advanced Loopholes and Mandatory Controls

1. Synthetic identity rings and mule networks.
Controls:
- Graph-based fraud analytics on shared device, IP, payout handle, and behavior clusters.
- Progressive KYC steps for suspicious clusters.

2. API replay and race-condition payout attacks.
Controls:
- Signed requests, nonce + timestamp validation.
- Server-side idempotent payout orchestration with distributed lock.

3. Event boundary gaming (entering risky zone right before trigger).
Controls:
- Minimum pre-event exposure window for eligibility.
- Time-window smoothing rules for trigger overlap.

4. Data poisoning or trigger feed manipulation.
Controls:
- Multi-source trigger confirmation for critical payout events.
- Feed integrity checks, signature validation, and anomaly alerts.

5. Adversarial behavior against fraud model.
Controls:
- Hybrid rule + ML decisioning (never ML-only for payout approval).
- Weekly drift monitoring and threshold recalibration.

### Decision Guardrails for Claims

1. Low fraud score: auto-approve with post-audit sampling.
2. Medium fraud score: hold-and-verify lane with delayed payout SLA.
3. High fraud score: mandatory manual review with investigator notes.
4. Critical mismatch (identity, payout destination, or impossible travel): auto-block and escalate.

### Security and Integrity Requirements (Non-Negotiable)

1. Idempotency keys on all claim and payout write APIs.
2. Immutable audit logs for policy, claim, fraud score, and payout state transitions.
3. Role-based access control for all admin and model-threshold changes.
4. Two-person approval for production fraud-threshold updates.
5. Full traceability of decision reasons shown in admin dashboard.

### Anti-Loophole KPIs

1. Confirmed fraud rate <= 2% of submitted claims (initial operating target, progressively reduced).
2. Fraud false-negative rate < 5% on simulated and red-team scenarios.
3. Duplicate payout leakage = 0.
4. High-risk claim manual-review SLA <= 30 minutes (demo environment).
5. Model/data drift alerts acknowledged within 1 business day.
6. Percent of blocked payouts later confirmed fraudulent >= 70% (precision health metric).

### Release Gates (Cannot Go Live Without)

1. Replay attack test passed.
2. Duplicate claim and duplicate payout tests passed.
3. GPS spoofing and impossible-travel simulation tests passed.
4. Trigger feed failover and integrity validation passed.
5. Audit log completeness test passed for end-to-end claim lifecycle.

### Extended Loophole Register (Critical Thinking)

1. Coverage wording arbitrage.
Severity: High.
Exploit pattern: Ambiguous terms like "active hours" and "income loss" are interpreted in user-favorable ways.
Controls: Policy glossary with machine-checkable definitions; claim engine must reference explicit term IDs.

2. Basis-risk dispute exploitation.
Severity: Medium.
Exploit pattern: Trigger conditions and actual income impact diverge, creating high dispute volume and appeal abuse.
Controls: Basis-risk monitoring index, goodwill-adjustment budget cap, and trigger calibration by city-season.

3. Trigger threshold cliff gaming.
Severity: High.
Exploit pattern: Abuse around cutoff boundaries where tiny measurement changes switch payouts on or off.
Controls: Confidence bands, payout smoothing, and anti-cliff scaling policy.

4. Adverse selection concentration.
Severity: High.
Exploit pattern: Only highest-risk users enroll, causing unsustainable claim profile.
Controls: Tiered plan design, waiting periods, continuity incentives, and risk-balanced pricing bands.

5. Churn and rejoin timing abuse.
Severity: High.
Exploit pattern: Cancel in safe windows and rejoin before predicted disruption.
Controls: Re-entry cooldown, continuity score impact, and anti-timing surcharge rule.

6. Referral and onboarding incentive farming.
Severity: Medium.
Exploit pattern: Fake accounts used to harvest referral or onboarding incentives.
Controls: Delayed reward unlock tied to verified policy persistence and fraud-clean activity period.

7. Manual review queue saturation attack.
Severity: High.
Exploit pattern: Flood medium-risk claims to overload analysts and force risky auto-decisions.
Controls: Queue capacity thresholds, surge-mode triage, and safe-fail payout pause switch.

8. Insider override misuse.
Severity: Critical.
Exploit pattern: Privileged user bypasses controls or reduces thresholds.
Controls: Just-in-time access, two-person approval, immutable admin action logs, and access recertification.

9. Label quality corruption in fraud model loop.
Severity: High.
Exploit pattern: Incorrect manual outcomes poison training data and reduce model precision.
Controls: Gold-label audit set, reviewer agreement tracking, and periodic retraining governance review.

10. Seasonal and geographic drift blind spots.
Severity: High.
Exploit pattern: Model and rules degrade in new cities or monsoon transition periods.
Controls: Drift monitors, city-season threshold packs, and rollback-to-safe-default policy.

11. Device lifecycle edge-case abuse.
Severity: Medium.
Exploit pattern: SIM/device change process is abused to reset trust state.
Controls: Progressive trust recovery with risk-based step-up verification.

12. Settlement mismatch duplicate payout leakage.
Severity: Critical.
Exploit pattern: Timeout or uncertain payout statuses are retried and later reconcile as duplicates.
Controls: Ledger-first payout state machine, end-to-end idempotency keys, and T+1/T+2 reconciliation jobs.

13. Third-party data dependency manipulation.
Severity: High.
Exploit pattern: Single-source weather or AQI anomalies incorrectly trigger claims.
Controls: Multi-source quorum, outlier rejection, and source trust scoring.

14. Time synchronization inconsistency.
Severity: High.
Exploit pattern: Timezone or clock mismatch incorrectly grants or denies eligibility.
Controls: UTC canonical timestamps and server-signed event-time evaluation only.

15. Privacy over-collection loophole.
Severity: Medium.
Exploit pattern: Excess data collection increases legal and reputational exposure.
Controls: Data minimization matrix, retention limits, and purpose-bound access policy.

16. Appeals-channel gaming.
Severity: Medium.
Exploit pattern: Repeated appeals are used to pressure manual approval.
Controls: Structured evidence requirements, appeal rate limits, and independent second reviewer.

17. Internal KPI gaming.
Severity: High.
Exploit pattern: Teams reduce fraud leakage by over-rejecting legitimate claims.
Controls: Balanced scorecard with fraud, fairness, and reliability metrics combined.

18. Catastrophe event operating-mode failure.
Severity: Critical.
Exploit pattern: During large disruption events, normal controls fail under load.
Controls: Catastrophe surge mode, queue prioritization, controlled payout windows, and staged release of approvals.

### Extended Register KPIs

1. Appeal overturn rate tracked weekly with threshold alerts.
2. False-positive rejection rate capped by risk policy.
3. Queue overload minutes per week monitored and reduced.
4. Settlement reconciliation mismatch count must trend to zero.
5. Drift-triggered rollback events are logged and reviewed.

### Extended Register Test Requirements

1. Cliff-threshold simulation tests for trigger boundaries.
2. Seasonal drift replay tests by city profile.
3. Queue saturation chaos tests for manual-review system.
4. Settlement uncertainty tests with delayed gateway confirmations.
5. KPI gaming scenario test where fairness and fraud metrics are jointly evaluated.

## 20) Delivery Governance and Build Readiness

### Build Authorization Rule
1. Planning-first mode is active.
2. No code implementation, environment setup, or deployment starts until explicit user instruction: "build".
3. Before build starts, freeze PRD version and baseline scope.

### Definition of Ready (DoR)
Every backlog item must have:
1. Clear business objective and user outcome.
2. Input and output contracts (API/event/schema).
3. Acceptance criteria with measurable pass/fail.
4. Security and fraud controls mapped.
5. Test cases listed (unit, integration, end-to-end).
6. Owner assigned (engineering, data, product, risk).

### Definition of Done (DoD)
A feature is done only if:
1. Functional acceptance criteria pass.
2. Fraud and abuse test scenarios pass.
3. Logging, alerting, and dashboard metrics are complete.
4. Performance SLO checks pass for impacted endpoints.
5. Security checklist and threat review are signed off.
6. Rollback plan exists and is validated.

## 21) Architecture Decisions (Locked for MVP)

1. Claims are event-driven and idempotent by design.
2. Fraud decisioning is hybrid (rules + ML), never ML-only payout approval.
3. Payout is asynchronous with durable state transitions.
4. Trigger ingestion uses confidence scoring and source verification.
5. All critical workflow transitions are audit-logged.

### Non-Negotiable Data Constraints
1. Unique active policy constraint per worker and coverage window.
2. Unique claim tuple per worker_id + policy_id + trigger_event_id.
3. Unique payout tuple per approved_claim_id + beneficiary_handle.
4. Soft-delete is disallowed for audit-sensitive entities; use status transitions only.

## 22) Implementation Blueprint (When Build Is Approved)

### Workstream A: Platform Foundation
1. Identity, OTP auth, role model, and session security.
2. Worker profile and risk profile services.
3. Core schema and migration baseline.

### Workstream B: Policy and Pricing
1. Weekly policy lifecycle APIs.
2. Pricing engine with explainability output.
3. Premium floor/ceiling and fairness guardrails.

### Workstream C: Trigger and Claims
1. Trigger ingestion adapters and confidence pipeline.
2. Eligibility evaluation and claim initiation orchestrator.
3. Moderation rules and burst-control logic.

### Workstream D: Fraud and Controls
1. Rule engine for deterministic checks.
2. Fraud scoring pipeline and reason tags.
3. Manual review queue and investigator workflow.

### Workstream E: Payout and Settlement
1. Payout adapter abstraction layer.
2. Idempotent payout processor with retries.
3. Reconciliation ledger and payout audit trail.

### Workstream F: Observability and Ops
1. Metrics, logs, and distributed trace baseline.
2. Fraud, claims, and reliability dashboards.
3. Alert rules and incident runbooks.

## 23) Quality Engineering Strategy

### Test Pyramid
1. Unit tests for pricing, eligibility, fraud rules, and payout calculations.
2. Integration tests for trigger ingestion, claim orchestration, and payout adapter.
3. End-to-end tests for onboarding-to-payout journey.
4. Red-team fraud simulations for replay, spoofing, duplication, and mule patterns.

### Mandatory Test Suites
1. Contract tests for all external adapters.
2. Idempotency tests for all write APIs.
3. Concurrency tests for race-condition payout flows.
4. Data integrity tests for unique constraints and audit logs.
5. Drift tests for fraud model stability.

### Quality Gates by Phase
1. Phase Gate A (Foundation): auth, schema, and policy lifecycle stable.
2. Phase Gate B (Automation): triggers and claim automation stable.
3. Phase Gate C (Scale): fraud controls, payout reliability, and dashboards stable.

## 24) Operational Controls and Incident Handling

1. Incident severity matrix for fraud leakage, payout delay, and trigger failures.
2. Auto-pause payout switch for anomaly spikes.
3. Manual override protocol with two-person approval and full audit trail.
4. Daily risk review covering false positives, false negatives, and blocked payout precision.
5. Weekly calibration meeting for pricing and fraud thresholds.

## 25) Metrics Framework (Executive + Engineering)

### Executive Metrics
1. Protected income payout reliability.
2. Claim incidence in moderate band.
3. Fraud payout leakage.
4. User retention and weekly renewals.

### Engineering Metrics
1. API p95 latency and error budget burn.
2. Queue lag and event processing delay.
3. Payout processing success and retry rates.
4. Alert mean-time-to-acknowledge and mean-time-to-resolve.

## 26) Requirement Traceability Matrix

Each major requirement must map to:
1. Feature owner.
2. Design artifact.
3. API or schema artifact.
4. Test cases.
5. Dashboard metric.
6. Release gate.

This matrix is mandatory before first implementation sprint.

## 27) Build Kickoff Checklist (Pre-Build Only)

1. PRD version frozen and approved.
2. Scope locked for MVP and non-goals reconfirmed.
3. Fraud control baselines approved by risk owner.
4. Data model and API contracts signed off.
5. Test strategy and quality gates approved.
6. Runbooks drafted for payout and fraud incidents.
7. Backlog estimated and sprint plan published.
8. Section 35 backup and recovery controls verified on staging.
9. Section 36 CI/CD pipeline and rollback drill verified on staging.
10. Section 37 API rate limiting controls verified on staging.
11. Section 38 live/ready/startup probes verified on staging.
12. Section 39 load test baseline and abuse scenarios executed with pass artifacts.
13. Section 40 API versioning policy and v1 contract tests verified.
14. Sections 41-55 business and insurance operating layers reviewed and owner-mapped.

## 28) Change Control

1. Any requirement change after build starts needs impact assessment on scope, timeline, risk, and fraud exposure.
2. High-impact changes require explicit approval from product and risk owners.
3. Emergency rule changes must be time-boxed and reviewed within 24 hours.

## 29) Final Planning Outcome

This PRD is now implementation-ready and structured to minimize mistakes through:
1. Clear scope and hard constraints.
2. Defense-in-depth fraud architecture.
3. Moderate claim control mechanisms.
4. Strict readiness, done, and release gates.
5. Traceable requirements and test-first quality controls.

## 30) Production Readiness Factor Register (Must/Should/Can)

Purpose: Ensure no critical preparation area is missed before implementation starts.

### 30.1 Scope, Policy, and Business Model

Must:
1. Freeze scope for MVP (income-loss-only, weekly pricing model).
2. Freeze non-goals and disallowed coverage areas.
3. Define policy semantics as machine-checkable rules.
4. Finalize city and persona launch focus.

Should:
1. Define expansion path for additional personas and geographies.
2. Build basis-risk exception policy with strict financial cap.

Can:
1. Create scenario cards for top disruption patterns by city.

### 30.2 Legal, Regulatory, and Compliance

Must:
1. Validate legal and regulatory obligations for product structure and disclosures.
2. Finalize grievance and appeal process with SLA.
3. Implement consent logging and retention policy.
4. Define data handling boundaries for PII and financial records.

Should:
1. Conduct legal review of rejection and delay explanations.
2. Prepare compliance evidence pack for audits.

Can:
1. Run independent policy wording stress review for ambiguity.

### 30.3 Unit Economics and Sustainability

Must:
1. Define target loss ratio bands by city and season.
2. Define premium adequacy monitoring and recalibration cadence.
3. Define acceptable claim incidence band and surge limits.

Should:
1. Build stress-case model for catastrophe periods.
2. Define incentives to limit adverse selection and churn abuse.

Can:
1. Build simulation dashboard for claim-frequency sensitivity.

### 30.4 Trigger and Data Source Integrity

Must:
1. Define trigger source priority and confidence scoring.
2. Define source-failure fallback strategy.
3. Define anti-cliff threshold smoothing and noise rejection.
4. Define UTC-only event time policy.

Should:
1. Define city-season threshold packs with review cadence.
2. Define source trust scores and anomaly quarantine rules.

Can:
1. Run synthetic trigger replay exercises before launch.

### 30.5 Fraud, Abuse, and Insider Risk

Must:
1. Enforce hard idempotency and unique constraints for claims and payouts.
2. Enforce critical-mismatch auto-block policy.
3. Enforce two-person approval for threshold and override changes.
4. Enforce immutable logging for all risk decisions.

Should:
1. Implement fraud graph detection for linked identities and payout destinations.
2. Implement reviewer quality checks and label governance.
3. Run recurring red-team abuse simulations.

Can:
1. Add deception signals and honeypot checks for high-risk flows.

### 30.6 Data Governance and MLOps

Must:
1. Define canonical data model and schema versioning rules.
2. Define model drift monitoring and rollback criteria.
3. Define threshold governance and approval workflow.
4. Define fairness monitoring dimensions.

Should:
1. Maintain champion-challenger model setup.
2. Track reviewer agreement for label quality.

Can:
1. Build adversarial simulation dataset for model hardening.

### 30.7 Security and Privacy Engineering

Must:
1. Enforce least-privilege access and secret rotation.
2. Enforce signed API requests and replay defenses.
3. Enforce encryption in transit and at rest.
4. Enforce data minimization and purpose-bound access.

Should:
1. Complete formal threat model and periodic penetration tests.
2. Add continuous monitoring for privileged actions.

Can:
1. Add runtime anomaly detection for admin control planes.

### 30.8 Reliability, Performance, and Resilience

Must:
1. Define retry policies with idempotent behavior.
2. Define queue backpressure and dead-letter handling.
3. Define service degradation modes under dependency failures.
4. Define catastrophe surge mode operations.

Should:
1. Run chaos tests on trigger and payout paths.
2. Define multi-region or failover playbook where feasible.

Can:
1. Implement predictive queue pressure alerting.

### 30.9 Payments, Reconciliation, and Financial Controls

Must:
1. Define payout state machine with terminal and uncertain states.
2. Define daily reconciliation and break-resolution SLA.
3. Define duplicate payout detection and containment response.
4. Define financial audit trail requirements.

Should:
1. Define maker-checker protocol for manual financial actions.
2. Define near-real-time mismatch monitoring.

Can:
1. Add anomaly detection on settlement lag patterns.

### 30.10 User Trust, Transparency, and Support

Must:
1. Provide plain-language explanations for premium, eligibility, and claim outcomes.
2. Provide clear policy visibility before purchase confirmation.
3. Define support SLA and dispute escalation paths.

Should:
1. Add multilingual communication templates.
2. Add transparent claim timeline tracker.

Can:
1. Add educational onboarding for parametric coverage behavior.

### 30.11 Operational Governance and Team Readiness

Must:
1. Define ownership matrix for product, engineering, data, risk, and ops.
2. Define incident severity matrix and response playbooks.
3. Define daily and weekly risk review rituals.

Should:
1. Define reviewer capacity plan and surge staffing.
2. Define fatigue controls and decision-quality audits.

Can:
1. Run simulation-based reviewer training.

### 30.12 Testing, Release Gating, and Change Control

Must:
1. Enforce mandatory unit, integration, contract, and end-to-end suites.
2. Enforce race, replay, spoofing, and reconciliation test scenarios.
3. Enforce release gates with hard stop criteria.
4. Enforce rollback rehearsal for critical releases.

Should:
1. Enforce non-functional performance and resilience budgets.
2. Enforce migration testing and rollback validation.

Can:
1. Add mutation testing for critical fraud-rule logic.

### 30.13 Metrics and Anti-Gaming Safeguards

Must:
1. Track fraud, fairness, reliability, and customer outcome metrics together.
2. Track false-positive, false-negative, appeal overturn, and payout delay trends.
3. Assign owner and action playbook for each red metric.

Should:
1. Track cohort-level metrics by city, season, and risk segment.
2. Add KPI guardrails to prevent over-rejection behavior.

Can:
1. Add early-warning predictive indicators for abuse spikes.

### 30.14 Vendor and Dependency Risk

Must:
1. Classify vendor criticality and fallback strategy.
2. Define dependency outage response plan.
3. Define version and change monitoring for third-party APIs.

Should:
1. Run periodic failover drills for key data providers.
2. Track usage-cost spike alerts.

Can:
1. Build synthetic health checks for third-party integration quality.

### 30.15 Rollout and Go-Live Readiness

Must:
1. Use phased launch with controlled cohorts.
2. Require go/no-go sign-off from product, engineering, risk, and ops.
3. Confirm build kickoff checklist completion before implementation start.

Should:
1. Start with one pilot city and constrained trigger set.
2. Run shadow-mode scoring prior to strict enforcement.

Can:
1. Add invite-only controlled beta before broad rollout.

## 31) Mandatory Pre-Implementation Final Gate

Implementation may begin only when all of the following are completed:
1. PRD scope and version freeze signed off.
2. Legal/compliance review signed off.
3. Fraud and release-gate policies signed off.
4. Data model and API contracts signed off.
5. Test strategy and runbooks signed off.
6. Ownership matrix and on-call plan signed off.
7. Phase-1 backlog validated against Definition of Ready.

## 32) Exhaustive Implementation Scope (What Will Be Built)

Purpose: Remove ambiguity and ensure all required components are explicitly listed before build start.

### 32.1 Foundation and Project Setup
1. Monorepo layout for frontend, backend, risk/fraud, and shared contracts.
2. Environment strategy for local, test, and production.
3. Configuration validation layer for mandatory environment variables.
4. Centralized error model and API response conventions.
5. Correlation ID propagation across services for traceability.

### 32.2 Identity, Access, and Sessions
1. OTP-based worker authentication.
2. Session and token lifecycle with secure refresh handling.
3. Role model: worker, reviewer, risk-admin, platform-admin.
4. Role-based authorization middleware and policy checks.
5. Immutable admin action audit entries.

### 32.3 Core Domain and Persistence
1. Worker and risk-profile entities.
2. Weekly policy entity and lifecycle states.
3. Trigger event and trigger confidence entities.
4. Claim entity with full decision and status history.
5. Fraud assessment entity with reason tags.
6. Payout transaction entity with reconciliation metadata.
7. Audit log entity for immutable lifecycle records.
8. Migration scripts, seed scripts, and schema versioning.

### 32.4 Policy, Pricing, and Explainability
1. Weekly quote generation and policy issuance workflows.
2. Dynamic premium computation with floor and ceiling rules.
3. Explainability response (top drivers affecting premium).
4. Policy activation controls including waiting periods.
5. Renewal, lapse, and cancellation handling.

### 32.5 Trigger Ingestion and Event Confidence
1. Weather integration adapter.
2. AQI integration adapter.
3. Optional local-restriction/platform-outage adapter.
4. Multi-source confirmation for critical trigger classes.
5. Trigger de-duplication, normalization, and timestamp standardization.
6. Trigger confidence scoring and anti-noise filtering.
7. Source outage fallback and degraded-mode logic.

### 32.6 Eligibility and Claim Orchestration
1. Event-driven claim initiation pipeline.
2. Eligibility checks for policy, zone, and time overlap.
3. Pre-event exposure verification for anti-gaming.
4. Claim moderation lane routing logic.
5. Claim lifecycle state machine: initiated, in_review, approved, rejected, paid.
6. Claim burst-control and surge-mode safeguards.

### 32.7 Fraud and Abuse Control Plane
1. Deterministic fraud rule engine.
2. Duplicate and replay prevention checks.
3. Velocity and linked-identity checks.
4. Impossible-travel and location trust checks.
5. Fraud scoring model service with reason tags.
6. Decision policy enforcement by risk tier.
7. Manual review queue and decision workflow.
8. Threshold governance and two-person override controls.

### 32.8 Payouts, Ledger, and Reconciliation
1. Payout adapter abstraction for sandbox providers.
2. Idempotent payout processor with distributed locking.
3. Payout uncertainty handling and safe retry policy.
4. Ledger-first state transitions for financial integrity.
5. Duplicate payout prevention constraints.
6. Reconciliation jobs and mismatch handling workflows.

### 32.9 Worker and Admin Experience
1. Worker onboarding and profile completion journey.
2. Worker quote, policy purchase, and renewal flow.
3. Worker claim and payout timeline visibility.
4. Admin claim review and decision workbench.
5. Admin fraud/trigger/risk dashboards.
6. Policy and payout status explainability surfaces.

### 32.10 Observability and Operations
1. Structured logs, core metrics, and alert routing.
2. Queue health monitoring and lag alerts.
3. Fraud and fairness KPI monitoring.
4. Incident response hooks and auto-pause payout control.
5. Ops runbooks for trigger, fraud, payout, and data incidents.

### 32.11 Security, Privacy, and Compliance Engineering
1. Transport and storage encryption controls.
2. Secret storage and rotation procedures.
3. Replay protection and signed request enforcement.
4. Data minimization and purpose-bound access policy.
5. Retention, deletion, and audit evidence workflows.

### 32.12 Quality and Release Assurance
1. Unit tests for rules, pricing, and payout calculations.
2. Integration tests for trigger-to-payout path.
3. Contract tests for external integrations.
4. End-to-end tests for onboarding-to-payment journeys.
5. Race, replay, spoofing, and duplicate prevention tests.
6. Drift and threshold stability tests.
7. Release gate verification with rollback rehearsals.

### 32.13 Documentation and Traceability
1. API contract documentation.
2. Data model and schema evolution documentation.
3. Fraud rulebook and threshold change log.
4. Operational runbooks and incident matrix.
5. Requirement-to-test-to-metric traceability matrix.

## 33) Manual Inputs Required From User During Build

These values are intentionally excluded from source code and must be provided manually at build/deploy time.

1. Database URL and credentials.
2. Cache/message broker connection strings.
3. Weather/AQI/API provider keys.
4. Payment sandbox credentials and callback secrets.
5. JWT/session signing secrets.
6. Encryption keys and key-management references.
7. SMTP/notification provider credentials.
8. Allowed domains and callback URLs by environment.
9. Compliance/legal content approved by policy/legal owner.
10. Incident escalation contacts and on-call routing IDs.

## 34) Final Nothing-Missed Checklist (Pre-Build Completeness)

All items below must be marked complete before implementation starts.

### 34.1 Product and Policy
1. Policy terms are machine-checkable and legally approved.
2. Scope and non-goals are frozen.
3. Launch persona/city and trigger set are frozen.
4. Underwriting policy (Section 41) and plan variants (Section 46) are approved.

### 34.2 Technical Design
1. Data model, constraints, and migrations are approved.
2. API contracts are approved.
3. Claim and payout state machines are approved.

### 34.3 Risk and Fraud
1. Fraud thresholds and manual-review lanes are approved.
2. Insider override controls are approved.
3. Red-team fraud test plan is approved.
4. Worker trust score policy (Section 45) is approved.

### 34.4 Reliability and Financial Integrity
1. Retry/idempotency strategy is approved.
2. Reconciliation strategy is approved.
3. Catastrophe surge mode is approved.
4. Capital and risk transfer model (Section 42) is approved.

### 34.5 Security and Privacy
1. Threat model baseline is approved.
2. Secret and key management plan is approved.
3. Data retention and deletion policy is approved.

### 34.6 Quality and Operations
1. Test suites and release gates are approved.
2. Incident runbooks and escalation matrix are approved.
3. Monitoring dashboards and alert thresholds are approved.

### 34.7 Delivery Governance
1. Ownership matrix is approved.
2. DoR and DoD enforcement is confirmed.
3. Change-control process is approved.
4. Distribution, growth, and expansion strategy sections (43, 49, 52) are approved.

### 34.8 Build Start Condition
1. Explicit user instruction "build" received.
2. Pre-build checklist signed off.
3. Required manual environment inputs provided.
4. Sections 35, 36, 37, 38, and 40 verified operational on staging.
5. Section 39 applicable phase load test gate passed.
6. Sections 41-55 are complete at planning level with documented owners and acceptance criteria.

## 35) Database Backup and Recovery

### 35.1 Purpose

Payout transaction records and audit logs are the highest-impact data in the system. Irreversible loss of either constitutes a financial, legal, and regulatory failure. This section defines the mandatory protection standards for all persistent data stores.

### 35.2 Recovery Objectives

| Tier | Data Class | RTO | RPO |
|------|-----------|-----|-----|
| Tier 0 | Payout transactions, audit logs, claim decisions | 60 minutes | 5 minutes |
| Tier 1 | Policy records, worker profiles, fraud assessments | 2 hours | 15 minutes |
| Tier 2 | Risk profiles, trigger snapshots, operational metrics | 4 hours | 1 hour |

RTO is measured from incident declaration to verified service restoration. RPO is the maximum acceptable data loss window measured backward from the point of failure.

### 35.3 Backup Schedule

Primary Transactional Database (PostgreSQL)

- Continuous WAL (Write-Ahead Log) archiving to object storage with 5-minute flush interval.
- Full snapshot backup: daily at 02:00 UTC.
- Incremental backup: every 6 hours.
- Retention window: 30 days for daily snapshots, 7 days for WAL archives.
- Backup encryption: AES-256 with keys stored separately from backup storage.

Cache Layer (Redis)

- AOF (Append-Only File) persistence enabled with fsync every second.
- RDB snapshot every 15 minutes for fast restore.
- Retention: 24 hours (cache is considered reconstructable from primary DB beyond this window).

Audit Log Store

- Treated as immutable append-only. Separate storage bucket with object lock (WORM policy) enabled.
- Replication to a second geographic region immediately on write.
- No deletion permitted via application layer. Retention minimum: 7 years (financial record requirement).
- Independent backup cycle: daily snapshot + continuous replication. Not subject to normal TTL policies.

Event Queue State (BullMQ/RabbitMQ)

- Queue persistence enabled on disk with sync writes.
- Dead-letter queue contents backed up daily.
- In-flight message state snapshotted every 30 minutes.

### 35.4 Point-in-Time Recovery (PITR)

- PITR enabled on the primary transactional database using WAL archives.
- Recovery can target any second within the WAL retention window (7 days).
- PITR procedure documented in operations runbook with step-by-step commands.
- PITR target must be validated against the audit log to confirm no approved claim or payout record is missing after recovery.

### 35.5 Restore Drill Cadence

| Drill Type | Frequency | Pass Criteria | Owner |
|-----------|-----------|--------------|-------|
| Full restore from snapshot | Monthly | Service online within RTO, zero Tier 0 record loss | Platform Lead |
| PITR to specific timestamp | Monthly | Data consistent with audit log at target time | Database Lead |
| Audit log integrity check | Weekly | Hash verification passes on all immutable records | Security Lead |
| Cross-region failover | Quarterly | Tier 0 RTO met from secondary region | Platform Lead |

Drill results are logged as audit entries. A failed drill is treated as a P0 incident and blocks the next production release.

### 35.6 Separate Protection Rules for Financial Records

The following entities are classified as financial records and subject to stricter controls than general application data:

- `PayoutTransaction`
- `AuditLog`
- `Claim` (terminal states: approved, rejected, paid only)
- `FraudAssessment` (final decision records)

Rules for financial records:

1. Soft-delete is already disallowed per Section 21. Backup deletion of these records is also disallowed.
2. Financial records are replicated to a secondary region within 30 seconds of write confirmation.
3. Backup access for financial records requires two-person authorization (same as production override protocol).
4. Any restore operation affecting financial records must produce a reconciliation report comparing pre- and post-restore record counts and checksums before service is re-enabled.

### 35.7 Owner and Release Gate

- Owner: Platform Lead (backup infrastructure), Database Lead (PITR policy), Security Lead (encryption and access).
- Release gate: First successful full restore drill and first successful PITR drill must be completed and logged before Phase 1 go-live.

## 36) CI/CD and Deployment Pipeline

### 36.1 Purpose

The rollback mechanism and release gate controls defined in Sections 23 and 24 cannot be executed without a defined pipeline. This section makes the pipeline a first-class product requirement, not an infrastructure assumption.

### 36.2 Branch Strategy

| Branch | Protection Rules | Purpose |
|--------|----------------|---------|
| `main` | Push blocked. Merge via PR only. Requires 2 approvals + all checks green. | Production source of truth. |
| `staging` | Push blocked. Merge via PR only. Requires 1 approval + all checks green. | Pre-production validation. |
| `develop` | Direct push allowed only for hotfix protocol (see 36.6). | Integration branch. |
| `feature/*` | No restrictions. Short-lived. | Feature development. |
| `hotfix/*` | Requires incident ticket reference in PR title. | Emergency production fix. |

No code reaches `main` without passing every stage defined in Section 36.3.

### 36.3 Pipeline Stages

Every pull request and merge to `develop`, `staging`, and `main` must pass all of the following stages in order. A failure in any stage blocks the pipeline and prevents promotion.

Stage 1 - Build
- Dependency installation with lockfile verification (no ad-hoc dependency resolution).
- Compile/transpile with zero warnings treated as errors.
- Docker image build for all services.
- Image vulnerability scan (CRITICAL and HIGH CVEs block the pipeline; MEDIUM generates a warning).

Stage 2 - Unit and Integration Tests
- Full unit test suite (pricing, eligibility, fraud rules, payout calculations).
- Integration tests for trigger ingestion, claim orchestration, and payout adapter.
- Minimum coverage gate: 80% line coverage on core domain logic. Below this, the pipeline fails.
- Test results published as pipeline artifact.

Stage 3 - Security Scan
- SAST (Static Application Security Testing) scan on application code.
- Dependency audit against known vulnerability database.
- Secret detection scan (no credentials, API keys, or tokens in source tree).
- A single confirmed secret detection result is a hard pipeline block with mandatory security review before merge.

Stage 4 - Contract Tests
- All external adapter contracts validated (weather API, AQI API, payment sandbox).
- Schema compatibility check for any changed API surface between services.
- Idempotency tests for all write endpoints.

Stage 5 - End-to-End Tests (staging environment only)
- Onboarding-to-payout journey.
- Trigger-to-claim automation path.
- Fraud block and manual review routing.
- Duplicate payout prevention.

### 36.4 Environment Promotion Path

feature/* -> develop -> staging -> main (production)

- Promotion from `develop` to `staging` is automatic on merge if all Stage 1-3 checks pass.
- Promotion from `staging` to `main` requires:
1. Stage 4 and Stage 5 checks passing on staging.
2. Manual approval from Engineering Lead and Risk Lead (two distinct approvers).
3. Deployment freeze check (see Section 36.6).
4. Rollback plan confirmed as documented and tested.

### 36.5 Rollback Mechanism and SLA

Rollback trigger conditions:
- Error rate on any core endpoint exceeds 1% for more than 3 minutes post-deployment.
- P95 latency exceeds 2x the SLO threshold for more than 5 minutes.
- Any payout processing failure not explained by a known external dependency outage.
- Manual trigger by Engineering Lead or on-call engineer.

Rollback mechanism:
- All deployments are blue-green or canary. Previous image version is retained and tagged.
- Rollback command redeploys the previous tagged image. No rebuild required.
- Database schema migrations that are not backward-compatible are blocked from merging. All schema changes must be backward-compatible for at least one release cycle (expand-contract pattern).
- If a migration was already applied, rollback proceeds at the application layer first; a separate migration reversal is evaluated independently with DBA sign-off.

Rollback SLA:
- Rollback must be initiated within 10 minutes of trigger condition being confirmed.
- Service must be restored to pre-deployment state within 30 minutes of rollback initiation.
- Post-rollback incident report required within 24 hours.

### 36.6 Deployment Freeze and Hotfix Protocol

Deployment freeze windows (production only):
- 48 hours before and after any major disruption season event (monsoon onset, declared civic emergency period).
- Friday 18:00 to Monday 09:00 IST unless a critical security patch is required.
- Freeze override requires Engineering Lead + Risk Lead written approval with incident ticket reference.

Hotfix protocol:
1. Incident ticket created and classified P0 or P1.
2. `hotfix/*` branch cut from `main` directly.
3. Fix applied, Stage 1-3 pipeline run against hotfix branch.
4. Single-approver merge to `main` permitted during active incident.
5. Hotfix immediately cherry-picked to `develop` and `staging` after production deployment.
6. Full retrospective completed within 48 hours.

### 36.7 Owner and Release Gate

- Owner: Engineering Lead (pipeline design and maintenance), DevOps/Platform Lead (environment infrastructure).
- Release gate: All five pipeline stages must be demonstrated passing end-to-end on a staging deployment before Phase 1 go-live. Rollback drill must be executed and logged.

## 37) API Rate Limiting

### 37.1 Purpose

Without rate limiting, the fraud controls and queue saturation protections defined in Sections 10 and 19 can be bypassed by high-volume API abuse. Rate limiting is a first line of defense that operates before application logic.

### 37.2 Limit Dimensions

Every API request is evaluated against two independent dimensions simultaneously. Both must pass; either can reject the request.

- Per-IP limit: Applied to the originating IP address. Protects against unauthenticated abuse, credential stuffing, and bot traffic.
- Per-identity limit: Applied to the authenticated worker_id or admin user_id. Protects against account-level abuse after authentication.

Both limits apply independently. A request can be blocked by either dimension regardless of the other.

### 37.3 Endpoint-Specific Limits

| Endpoint Group | Per-IP (per minute) | Per-Identity (per minute) | Burst (per second) | Notes |
|---------------|--------------------|--------------------------|--------------------|-------|
| OTP request | 5 | 3 | 1 | Hard limit. Retry-after enforced. |
| Worker onboarding | 10 | 5 | 2 | |
| Policy quote | 30 | 20 | 5 | |
| Policy purchase | 10 | 5 | 1 | |
| Claim initiation (manual) | 5 | 3 | 1 | Parametric auto-initiation exempt (internal only). |
| Claim status read | 60 | 60 | 10 | |
| Payout status read | 60 | 60 | 10 | |
| Admin dashboard reads | 120 | 120 | 20 | |
| Admin fraud override | 10 | 5 | 1 | Requires two-person approval regardless. |
| Trigger ingestion (internal) | N/A | N/A | N/A | Exempt. Internal service only (see 37.5). |
| Webhook callbacks (payment) | N/A | N/A | N/A | Exempt. Validated by signature, not rate-limited. |

### 37.4 Burst and Sustained Limits

Two limit modes apply to every endpoint:

- Sustained limit: Enforced over a 60-second rolling window. The values in Section 37.3 are sustained limits.
- Burst limit: Enforced over a 1-second window. Allows short spikes without triggering the sustained limit prematurely. Burst limits are defined per endpoint in the rightmost column of Section 37.3.

A request that exceeds either the sustained or burst limit within its window is rejected immediately with HTTP 429.

### 37.5 Response Behavior

All rate-limited responses must conform to the following:

- HTTP status: `429 Too Many Requests`.
- Response header: `Retry-After: <seconds>` indicating when the rate limit window resets.
- Response header: `X-RateLimit-Limit: <limit>` indicating the applicable limit.
- Response header: `X-RateLimit-Remaining: <remaining>` indicating requests remaining in the current window.
- Response body: Standard error envelope with `error_code: RATE_LIMIT_EXCEEDED` and human-readable `message`.
- No information about which dimension (IP vs identity) triggered the limit is exposed in the response (prevents enumeration).

### 37.6 Exemption Policy

The following are exempt from rate limiting. Exemptions are enforced by the API gateway, not by application code. No application-layer bypass is permitted.

- Internal service-to-service calls authenticated via internal service identity (mTLS or internal API key with `X-Internal-Service` header).
- Payment gateway webhook callbacks validated by HMAC signature.
- Trigger ingestion service inbound calls from trusted ingestion worker.

No worker account, admin account, or external third party is ever exempt. Trusted internal service identity must not be exposed to external callers.

### 37.7 Monitoring and Alerting

- Rate limit hit rate tracked per endpoint and per identity cohort.
- Alert threshold: if per-identity rate limit hits exceed 10% of total requests on any endpoint for more than 5 minutes, generate a P2 alert (potential abuse pattern).
- Alert threshold: if per-IP rate limit hits exceed 5% of total requests for more than 2 minutes, generate a P1 alert (potential coordinated attack).
- All rate limit events are logged with IP, identity (if authenticated), endpoint, and timestamp. Logs are retained for 90 days.

### 37.8 Owner and Release Gate

- Owner: Engineering Lead (limit design), Security Lead (monitoring and alert thresholds).
- Release gate: Rate limiting must be demonstrated operational on staging with test cases covering per-IP block, per-identity block, burst block, and correct Retry-After header behavior before Phase 1 go-live.

## 38) Health and Readiness Endpoints

### 38.1 Purpose

Container orchestration (Docker, Kubernetes, or cloud run environments) and load balancers depend on health signals to route traffic correctly and restart failed instances. Without these endpoints, failed services receive live traffic and degraded modes are invisible to the platform.

### 38.2 Endpoint Definitions

Every service in the system must expose the following three endpoints on a dedicated internal port (not the public API port):

Liveness endpoint - `/internal/live`

Answers: Is this process alive and not deadlocked?

- Returns HTTP 200 if the process is running and its event loop (or equivalent) is responsive.
- Returns HTTP 503 if the process is alive but detected as deadlocked or permanently stuck.
- Must respond within 500ms. No external dependency checks. If it times out, the orchestrator treats it as a failure.
- Failure action: orchestrator restarts the container.

Readiness endpoint - `/internal/ready`

Answers: Is this service able to serve traffic right now?

- Returns HTTP 200 only if all of the following pass:
- Database connection pool has at least one healthy connection.
- Cache connection is reachable.
- Message queue connection is established.
- Any critical downstream dependency (payment adapter, fraud scoring service) has responded within the last N seconds (configurable per service).
- Returns HTTP 503 with a JSON body listing which dependency checks failed if any single check fails.
- Must respond within 2 seconds.
- Failure action: load balancer removes this instance from the rotation. Orchestrator does not restart (the process is alive but not ready).

Startup probe - `/internal/startup`

Answers: Has this service finished its initialization sequence?

- Returns HTTP 200 only after the service has completed: schema migration checks, cache warm-up (if applicable), and initial configuration validation.
- Returns HTTP 503 during initialization.
- Liveness and readiness checks are not evaluated until the startup probe returns 200 for the first time.
- Startup probe timeout is configurable per service (default: 60 seconds before the orchestrator gives up and restarts).

### 38.3 Degraded Mode Signaling

A service may be live and ready but operating in a degraded state (for example: using mock weather data due to external API unavailability, as defined in Section 16). Degraded mode must be signaled as follows:

- Readiness endpoint returns HTTP 200 (service can still handle traffic).
- Response body includes `"degraded": true` and `"degraded_reasons": ["weather_api_unavailable"]`.
- A degraded signal is propagated to the observability layer and generates an automatic P2 alert.
- Degraded mode does not remove the instance from load balancer rotation unless explicitly configured to do so for specific degradation types (configurable per service).

### 38.4 Response Schema

All three endpoints return a consistent JSON schema:

```json
{
	"status": "ok | degraded | unavailable",
	"service": "<service_name>",
	"timestamp": "<UTC ISO8601>",
	"checks": {
		"database": "ok | fail",
		"cache": "ok | fail",
		"queue": "ok | fail",
		"fraud_service": "ok | fail | degraded"
	},
	"degraded": false,
	"degraded_reasons": []
}
```

### 38.5 Alert Conditions

| Condition | Severity | Response |
|-----------|----------|----------|
| Liveness probe fails on any instance | P1 | Orchestrator restarts. Alert sent immediately. |
| Readiness probe fails on >50% of instances for a service | P0 | Payout auto-pause switch activated. Incident declared. |
| Startup probe exceeds timeout on new deployment | P1 | Deployment halted. Rollback initiated per Section 36.5. |
| Degraded mode active for >15 minutes | P2 | Alert to on-call. Incident ticket opened. |
| Degraded mode active for >60 minutes | P1 | Escalation to Engineering Lead. |

### 38.6 Owner and Release Gate

- Owner: Engineering Lead (endpoint implementation), Platform Lead (orchestrator configuration).
- Release gate: All three probe types must be demonstrated functional on staging, including a simulated dependency failure causing a readiness 503, before Phase 1 go-live.

## 39) Load Test Plan

### 39.1 Purpose

The SLO targets in Section 7 (p95 API latency < 400ms, 10,000 workers in simulation) and the performance KPI in Section 4 (quote response <= 2 seconds, trigger-to-payout <= 10 minutes) are not verifiable without a defined load test plan. This section makes load testing a release gate, not a post-launch activity.

### 39.2 Tool and Ownership

- Primary tool: k6 (open source, scriptable, CI-integrable).
- Alternative: Locust (Python) if k6 is not available in the build environment.
- Test ownership: Engineering Lead is accountable for test design and results. Each workstream lead is responsible for load test coverage of their service boundary.
- Test scripts are version-controlled in the same monorepo as application code. They are not ad-hoc.

### 39.3 Scenario Profiles

Four scenarios must be defined and executed before each Phase gate.

Scenario 1 - Baseline (normal load)

- Virtual users: 500 concurrent workers performing normal actions (quote, policy purchase, status check).
- Duration: 15 minutes steady state after a 5-minute ramp-up.
- Data volume: 5,000 active policies in the database, 500 trigger events pre-seeded.
- Pass criteria: p95 latency < 400ms on all read endpoints, p95 < 800ms on write endpoints, error rate < 0.1%.

Scenario 2 - Peak load (disruption event)

- Virtual users: 2,000 concurrent workers checking claim status simultaneously (simulates a trigger event notification going out).
- Duration: 10 minutes.
- Data volume: 10,000 active policies, 1 active trigger event affecting all zones.
- Pass criteria: p95 latency < 800ms on claim status endpoint, claim initiation queue lag < 30 seconds, payout processing does not stall, error rate < 0.5%.

Scenario 3 - Abuse burst

- Virtual users: 50 bot clients each sending 200 requests per minute to claim and payout endpoints (well above rate limits).
- Duration: 5 minutes.
- Pass criteria: 429 responses returned for all requests exceeding rate limit thresholds, no 5xx errors generated, no queue overload, legitimate Scenario 1 traffic running in parallel is unaffected (p95 does not degrade by more than 20%).

Scenario 4 - Recovery

- Simulate Scenario 2 peak load, then kill one service instance mid-test.
- Pass criteria: orchestrator restarts the instance within 60 seconds, traffic automatically reroutes to healthy instances, no payout records are lost or duplicated during the restart window, total error rate during failure window < 2%.

### 39.4 Ramp Model

All scenarios use a linear ramp-up (not a step function) to avoid false spike artifacts. Ramp duration is 20% of total test duration (for a 15-minute test, ramp is 3 minutes, steady state is 12 minutes). Results are only evaluated against the steady-state window, not the ramp window.

### 39.5 Data Volume Assumptions

Load tests must run against a realistic data set, not an empty or trivially small database. Before any load test run, the following seed data must be present:

- 10,000 worker profiles with realistic zone and earning distributions.
- 10,000 active or recently lapsed policies across all lifecycle states.
- 50,000 historical audit log entries.
- 5,000 historical claim records including approved, rejected, and paid states.
- 1,000 fraud assessment records.
- 500 payout transaction records.

Seed data generation is a scripted task, version-controlled, and runnable as part of the CI pipeline for the staging environment.

### 39.6 Pass/Fail Gates

A load test run produces a pass or fail verdict. The verdict is recorded as a pipeline artifact and linked to the release gate checklist. Partial passes are treated as failures.

| Metric | Pass Threshold |
|--------|---------------|
| p95 API latency (core read flows) | < 400ms |
| p95 API latency (write flows) | < 800ms |
| Error rate (Scenarios 1 and 2) | < 0.5% |
| Error rate (Scenario 3 - abuse burst) | < 0.1% for legitimate traffic |
| Claim initiation queue lag (Scenario 2) | < 30 seconds |
| Payout processing completion (Scenario 2) | 100% of initiated payouts reach terminal state within 10 minutes |
| Record loss during instance failure (Scenario 4) | Zero payout or audit records lost |
| Duplicate payouts generated (any scenario) | Zero |

### 39.7 Owner and Release Gate

- Owner: Engineering Lead (test design and execution), each workstream lead (service-level coverage).
- Release gate: Scenario 1 and Scenario 3 must pass before Phase 2 go-live. All four scenarios must pass before Phase 3 go-live (full production readiness).

## 40) API Versioning Strategy

### 40.1 Purpose

As the system evolves across phases, API contracts between services and between the backend and frontend will change. Without a versioning strategy, breaking changes cause silent failures, client outages, and schema migration incidents that cannot be safely rolled back.

### 40.2 Versioning Approach

URL path versioning is the mandatory approach for all public-facing and inter-service APIs.

Format: `/api/v{major}/{resource}/{action}`

Examples:
- `/api/v1/policies/quote`
- `/api/v1/claims/{claim_id}/status`
- `/api/v2/claims/{claim_id}/status` (when a breaking change is introduced)

Header-based versioning is not used. Query parameter versioning is not used. Both approaches make API contracts implicit and unroutable at the gateway layer.

The major version number increments only on breaking changes (see Section 40.3). Non-breaking changes are deployed to the existing version without a version increment.

### 40.3 Backward Compatibility Rules

A change is classified as breaking or non-breaking as follows:

Non-breaking changes (deploy to existing version, no increment):
- Adding a new optional field to a response body.
- Adding a new optional query parameter.
- Adding a new endpoint to an existing version.
- Expanding an enum with a new value (consumers must be built to handle unknown enum values).
- Performance improvements with no contract change.

Breaking changes (require new major version):
- Removing a field from a request or response body.
- Renaming a field.
- Changing the type of a field.
- Changing the HTTP method of an existing endpoint.
- Changing the meaning of an existing enum value.
- Making a previously optional field required.
- Removing an endpoint.
- Changing claim or payout state machine transition rules in a way that affects client state rendering.

Any breaking change must go through the deprecation process defined in Section 40.4 before the old version is removed.

### 40.4 Deprecation Notice Window

1. When a new API version is released containing breaking changes, the old version enters deprecation status immediately.
2. Deprecation is signaled by adding `Deprecation: true` and `Sunset: <date>` headers to all responses from the deprecated version.
3. The minimum deprecation window is 30 days for internal service consumers and 60 days for external or third-party consumers (if any are present at time of deprecation).
4. The deprecated version remains fully functional during the deprecation window.
5. After the sunset date, the deprecated version returns HTTP 410 Gone for all requests, with a response body pointing to the current version.
6. Deprecation notices are communicated to all known consumers at the time of release. For the admin and worker frontends, this means a coordinated deployment where both API and client are updated within the same release window.

### 40.5 Schema Migration Sequencing

All database schema changes that affect API-visible fields must follow the expand-contract pattern:

Phase 1 - Expand: Add the new column or table. The old column remains. Both versions of the API can function.

Phase 2 - Migrate: Backfill data. Both columns are live. The new API version reads from the new column.

Phase 3 - Contract: Remove the old column only after the old API version has been sunset and no active consumer references it.

No migration may skip Phase 1 and go directly to Phase 3. This rule is enforced at code review. A migration that removes a column used by a live API version is a build-blocking violation.

### 40.6 Contract Testing Across Versions

- Every API version has a corresponding contract test suite.
- Contract tests are run in the CI pipeline on every build (not only on version change).
- When a new version is introduced, contract tests for both the old and new versions run in parallel until the old version is sunset.
- A breaking contract test failure on a currently-live version is a pipeline hard-block regardless of what changed.
- Contract tests cover: required field presence, field types, enum value sets, HTTP status codes for standard error conditions, and idempotency behavior on write endpoints.

### 40.7 Owner and Release Gate

- Owner: Engineering Lead (versioning policy), each workstream lead (contract test coverage for their service boundary).
- Release gate: Contract tests for all v1 endpoints must be passing in the CI pipeline before Phase 1 go-live. The versioning policy document and deprecation communication template must be finalized and approved before any external consumer is granted API access.

## Amendment Summary

| Section | Title | Priority | Release Gate Phase |
|---------|-------|----------|--------------------|
| 35 | Database Backup and Recovery | P0 | Phase 1 |
| 36 | CI/CD and Deployment Pipeline | P0 | Phase 1 |
| 37 | API Rate Limiting | P0 | Phase 1 |
| 38 | Health and Readiness Endpoints | P1 | Phase 1 |
| 39 | Load Test Plan | P1 | Phase 2 (full: Phase 3) |
| 40 | API Versioning Strategy | P1 | Phase 1 |

All six sections are mandatory additions to the Build Kickoff Checklist (Section 27) and the Final Nothing-Missed Checklist (Section 34). No Phase 1 deployment proceeds without Sections 35, 36, 37, 38, and 40 verified operational on staging.

## 41) Underwriting and Eligibility Policy

### 41.1 Purpose

Define who is eligible for coverage, the limits of insurability, and risk segmentation to protect actuarial sustainability.

### 41.2 Worker Eligibility Rules

1. Minimum account age on partner platform: 30 days.
2. Minimum historical activity: 40 online hours in last 14 days.
3. Verified payout account (bank/UPI) required before policy activation.
4. Location consistency score must meet threshold over trailing 14 days.
5. Worker must accept policy terms and parametric trigger disclosures.

### 41.3 Coverage Limits

1. Maximum weekly coverage cap per worker: configurable by segment and city.
2. Maximum payout per trigger event per worker: capped by policy plan.
3. Maximum payout per worker per month: hard cap for risk containment.
4. Maximum aggregate coverage per geographic zone: exposure control threshold.

### 41.4 Underwriting Risk Segments

| Segment | Risk Profile | Pricing | Coverage Policy |
|---------|--------------|---------|-----------------|
| Low Risk | Stable city zones, low disruption history | Standard | Full plan options |
| Medium Risk | Seasonal weather volatility | Higher premium | Moderate caps |
| High Risk | Flood/heat/AQI extreme zones | Premium + restrictions | Limited caps and stricter waiting periods |

### 41.5 Underwriting Decision Outcomes

1. Accept with standard limits.
2. Accept with restricted limits.
3. Accept with higher waiting period.
4. Decline with clear reason code.

## 42) Capital and Risk Transfer Model

### 42.1 Purpose

Define how claim liabilities are funded and how catastrophic risk is transferred.

### 42.2 Risk Carrier Models

1. Licensed insurer partner model.
2. MGA distribution model with insurer-backed underwriting.
3. Reinsurance-backed pooled structure (where legally permitted).

### 42.3 Catastrophe Risk Strategy

1. Maximum exposure per city per week.
2. Maximum exposure per event window.
3. Reinsurance trigger layer based on aggregate event losses.
4. Catastrophe stop-loss threshold to limit retained losses.

### 42.4 Example Risk Layering

1. Primary layer: insurer retains first payout band.
2. Excess layer: reinsurer covers losses above attachment point.
3. Emergency controls: catastrophe mode from Section 51 auto-applies above defined load/exposure thresholds.

## 43) Platform Distribution Strategy

### 43.1 Purpose

Define how workers discover and purchase coverage through gig platforms.

### 43.2 Distribution Models

1. Embedded insurance offer inside partner apps.
2. Direct-to-worker onboarding with partner verification API.
3. Assisted enrollment via platform operations teams.

### 43.3 Integration Targets

1. Food delivery platforms.
2. Grocery and quick-commerce platforms.
3. E-commerce last-mile partner networks.

### 43.4 Data Exchange Contracts

Platform to Suraksha Weekly feeds:
1. Worker activity feed.
2. Zone assignment updates.
3. Online/offline status windows.
4. Delivery pattern signals.

Benefits:
1. Better trigger accuracy.
2. Better fraud detection and exposure verification.
3. Better underwriting calibration.

## 44) Insurance Economics Simulation Engine

### 44.1 Purpose

Continuously simulate portfolio outcomes before pricing and rule changes are released.

### 44.2 Simulation Inputs

1. Claim frequency distribution by segment.
2. Claim severity distribution by trigger type.
3. Seasonal weather and AQI patterns.
4. City-level disruption correlations.
5. Policy mix by plan and segment.

### 44.3 Required Simulation Scenarios

1. Monsoon stress test.
2. AQI season stress test.
3. Extreme heatwave scenario.
4. Civic restriction/city-lockdown scenario.

### 44.4 Simulation Outputs

1. Loss ratio projection.
2. Combined ratio projection.
3. Required premium adjustment band.
4. Exposure-at-risk by city and segment.

### 44.5 Release Gate Use

Any material pricing or underwriting threshold change must include simulation evidence before approval.

## 45) Worker Trust Score System

### 45.1 Purpose

Create a long-term behavior signal that improves fraud resistance and rewards healthy usage.

### 45.2 Trust Score Components

1. Activity consistency.
2. Policy continuity.
3. Historical fraud flags.
4. Location trust score.
5. Claim behavior consistency.

### 45.3 Trust Tier Policy

| Tier | Eligibility Impact | Pricing Impact | Payout Speed |
|------|--------------------|----------------|--------------|
| Bronze | Standard checks | Standard pricing | Standard SLA |
| Silver | Reduced friction | Minor discount | Faster processing |
| Gold | Preferred checks | Best eligible pricing band | Priority processing |

### 45.4 Guardrails

1. Trust score cannot override critical fraud-block conditions.
2. Score changes must be explainable and auditable.

## 46) Plan Variants and Product Packaging

### 46.1 Purpose

Offer differentiated plans to improve conversion and retention while controlling risk.

### 46.2 Plan Structure

1. Basic Plan: lower premium, lower coverage caps.
2. Standard Plan: balanced premium and coverage.
3. Pro Plan: higher premium, higher caps, stricter eligibility.

### 46.3 Plan Control Rules

1. Plan caps are linked to underwriting segment.
2. Plan upgrades may include cooldown checks.
3. Plan downgrades take effect next renewal cycle.

## 47) User Education and Transparency Layer

### 47.1 Purpose

Reduce misunderstanding of parametric insurance and improve trust in automated decisions.

### 47.2 Required Components

1. Interactive coverage simulator.
2. Trigger explanation screens.
3. Payout estimator.
4. Claim explanation cards with reason tags.
5. Visual event timeline from trigger to payout.

### 47.3 Example Explanation Format

1. Trigger detected (type, zone, timestamp).
2. Covered hours affected.
3. Applied policy rule and cap.
4. Final payout amount with formula breakdown.

## 48) Data Intelligence Layer and Monetization Path

### 48.1 Purpose

Define future data-intelligence products while preserving privacy and compliance boundaries.

### 48.2 Insight Products (Aggregated/Anonymized Only)

1. Weather impact on delivery productivity.
2. City-level disruption analytics.
3. Earnings volatility heatmaps by region and season.

### 48.3 Potential B2B Consumers

1. Logistics platforms.
2. Urban planning and mobility bodies.
3. Insurers and reinsurers.

### 48.4 Governance Constraints

1. No sale of raw personally identifiable worker data.
2. Minimum aggregation threshold enforced before export.
3. All exports must pass privacy review and legal approval.

## 49) Growth Strategy and Network Effects

### 49.1 Growth Channels

1. Platform partnerships and embedded distribution.
2. Worker referral loops with anti-abuse controls.
3. City cluster expansion based on loss-ratio viability.
4. Seasonal protection campaigns.

### 49.2 Example Campaign Themes

1. Monsoon protection campaign.
2. AQI protection campaign.
3. Heatwave earnings shield campaign.

### 49.3 Growth Guardrails

1. Growth incentives must not weaken underwriting discipline.
2. Referral rewards unlock only after fraud-clean persistence window.

## 50) Unit Economics Framework

### 50.1 Core Metrics

1. Average weekly premium per active policy.
2. Average weekly claim cost per active policy.
3. Gross loss ratio.
4. Operating cost per policy.
5. Combined ratio.
6. Contribution margin.

### 50.2 Reference Calculation Template

1. Gross Loss Ratio = Claims Incurred / Earned Premium.
2. Combined Ratio = (Claims Incurred + Operating Expense) / Earned Premium.
3. Contribution Margin = 1 - Combined Ratio.

### 50.3 Portfolio Guardrails

1. Combined ratio target threshold by phase.
2. City-level stop/slow expansion condition if combined ratio exceeds threshold for sustained windows.

## 51) Catastrophe Operating Mode

### 51.1 Trigger Conditions

1. Extreme weather or air-quality events affecting large cohorts.
2. Civic restrictions causing concentrated claim spikes.
3. System-level queue or payout pressure above defined limits.

### 51.2 Catastrophe Mode Behavior

1. Batch claim processing and prioritized execution lanes.
2. Controlled payout throttling with transparency notifications.
3. Surge reviewer capacity activation.
4. Temporary stricter fraud thresholds for high-risk lanes.

### 51.3 Exit Conditions

1. Queue lag returns below threshold.
2. Trigger volume normalizes.
3. Manual risk sign-off confirms return to normal mode.

## 52) Ecosystem Expansion Strategy

### 52.1 Near-Term Expansion Cohorts

1. Ride-sharing drivers.
2. Independent couriers.
3. Additional platform-based gig categories where income loss is event-driven.

### 52.2 Expansion Criteria

1. Sufficient trigger quality and observability.
2. Underwriting viability and acceptable combined ratio.
3. Operational support readiness.

## 53) Regulatory and Licensing Strategy

### 53.1 Operating Structures

1. MGA plus licensed insurer model.
2. Embedded insurance under insurer partner approvals.
3. Microinsurance-aligned packaging where applicable.

### 53.2 Compliance Areas

1. KYC and identity requirements.
2. Grievance redressal and customer communication standards.
3. Product disclosure obligations.
4. Claims and payout record retention and auditability.

### 53.3 Regulatory Readiness Gate

No public rollout proceeds without legal and compliance sign-off on distribution, disclosures, and grievance workflows.

## 54) Competitive Landscape and Positioning

### 54.1 Comparator Categories

1. Digital-first insurers.
2. Employer-linked benefits platforms.
3. Early gig-protection offerings.

### 54.2 Suraksha Weekly Differentiation

1. Parametric trigger-based automation for speed.
2. Weekly pricing aligned to gig earnings cycle.
3. Built-in fraud, trust, and explainability stack.
4. Climate/disruption-first income protection focus.

## 55) Strategic Narrative and Investor Story

### 55.1 Narrative Pillars

1. Climate volatility is increasing income instability.
2. Gig economy growth demands short-cycle protection products.
3. Traditional claims-heavy insurance is slow and high-friction for this persona.
4. Parametric, data-driven coverage enables fast and explainable protection.

### 55.2 Storyline for Demos and Stakeholders

1. User problem at city and worker level.
2. Product workflow from trigger to payout.
3. Economics and sustainability proof points.
4. Risk controls and compliance posture.
5. Scalable roadmap and ecosystem expansion.
