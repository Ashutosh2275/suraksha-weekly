-- Create enums
CREATE TYPE "PlatformType" AS ENUM ('SWIGGY', 'ZOMATO', 'OTHER');
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'LAPSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "TriggerType" AS ENUM ('HEAVY_RAIN', 'EXTREME_HEAT', 'SEVERE_POLLUTION', 'LOCAL_RESTRICTION', 'PLATFORM_OUTAGE');
CREATE TYPE "ClaimStatus" AS ENUM ('INITIATED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "FraudRiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "FraudDecision" AS ENUM ('APPROVE', 'HOLD', 'BLOCK');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'UNCERTAIN');

-- Create tables
CREATE TABLE "workers" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "platform_type" "PlatformType" NOT NULL,
    "avg_daily_hours" DECIMAL(5,2) NOT NULL,
    "avg_weekly_earnings" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_profiles" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "location_risk_index" DECIMAL(6,3) NOT NULL,
    "disruption_frequency_score" DECIMAL(6,3) NOT NULL,
    "exposure_multiplier" DECIMAL(6,3) NOT NULL,
    "trust_adjustment" DECIMAL(4,2) NOT NULL,
    "last_computed_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "risk_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "PolicyStatus" NOT NULL,
    "coverage_start" TIMESTAMP(3) NOT NULL,
    "coverage_end" TIMESTAMP(3) NOT NULL,
    "premium_amount" DECIMAL(12,2) NOT NULL,
    "coverage_limit" DECIMAL(12,2) NOT NULL,
    "zone_ids" TEXT[] NOT NULL,
    "waiting_period_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trigger_events" (
    "id" UUID NOT NULL,
    "trigger_type" "TriggerType" NOT NULL,
    "zone_id" TEXT NOT NULL,
    "severity_factor" DECIMAL(6,3) NOT NULL,
    "confidence_score" DECIMAL(6,3) NOT NULL,
    "source_data" JSONB NOT NULL,
    "event_start" TIMESTAMP(3) NOT NULL,
    "event_end" TIMESTAMP(3) NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trigger_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "trigger_event_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "payout_amount" DECIMAL(12,2),
    "rejection_reason" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "decision_trace" JSONB NOT NULL,
    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fraud_assessments" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "fraud_score" DECIMAL(4,3) NOT NULL,
    "risk_tier" "FraudRiskTier" NOT NULL,
    "reason_tags" TEXT[] NOT NULL,
    "rule_flags" JSONB NOT NULL,
    "ml_score" DECIMAL(4,3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "decision" "FraudDecision" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fraud_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_transactions" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "beneficiary_handle" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_reference" TEXT,
    "status" "PayoutStatus" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payout_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "previous_state" JSONB,
    "new_state" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "workers_phone_key" ON "workers"("phone");
CREATE UNIQUE INDEX "risk_profiles_worker_id_key" ON "risk_profiles"("worker_id");
CREATE UNIQUE INDEX "policies_worker_id_coverage_start_key" ON "policies"("worker_id", "coverage_start");
CREATE UNIQUE INDEX "claims_worker_id_policy_id_trigger_event_id_key" ON "claims"("worker_id", "policy_id", "trigger_event_id");
CREATE UNIQUE INDEX "fraud_assessments_claim_id_key" ON "fraud_assessments"("claim_id");
CREATE UNIQUE INDEX "payout_transactions_claim_id_key" ON "payout_transactions"("claim_id");
CREATE UNIQUE INDEX "payout_transactions_idempotency_key_key" ON "payout_transactions"("idempotency_key");

-- Create indexes
CREATE INDEX "workers_city_idx" ON "workers"("city");
CREATE INDEX "workers_platform_type_idx" ON "workers"("platform_type");
CREATE INDEX "policies_worker_id_idx" ON "policies"("worker_id");
CREATE INDEX "policies_status_idx" ON "policies"("status");
CREATE INDEX "trigger_events_zone_id_idx" ON "trigger_events"("zone_id");
CREATE INDEX "trigger_events_trigger_type_idx" ON "trigger_events"("trigger_type");
CREATE INDEX "claims_status_idx" ON "claims"("status");
CREATE INDEX "claims_initiated_at_idx" ON "claims"("initiated_at");
CREATE INDEX "fraud_assessments_risk_tier_idx" ON "fraud_assessments"("risk_tier");
CREATE INDEX "payout_transactions_status_idx" ON "payout_transactions"("status");
CREATE INDEX "payout_transactions_initiated_at_idx" ON "payout_transactions"("initiated_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- Add check constraints
ALTER TABLE "risk_profiles"
  ADD CONSTRAINT "risk_profiles_trust_adjustment_check"
  CHECK ("trust_adjustment" >= 0.50 AND "trust_adjustment" <= 1.50);

ALTER TABLE "fraud_assessments"
  ADD CONSTRAINT "fraud_assessments_fraud_score_check"
  CHECK ("fraud_score" >= 0.000 AND "fraud_score" <= 1.000),
  ADD CONSTRAINT "fraud_assessments_ml_score_check"
  CHECK ("ml_score" IS NULL OR ("ml_score" >= 0.000 AND "ml_score" <= 1.000));

ALTER TABLE "policies"
  ADD CONSTRAINT "policies_coverage_window_check"
  CHECK ("coverage_end" > "coverage_start");

ALTER TABLE "trigger_events"
  ADD CONSTRAINT "trigger_events_event_window_check"
  CHECK ("event_end" >= "event_start"),
  ADD CONSTRAINT "trigger_events_confidence_score_check"
  CHECK ("confidence_score" >= 0.000 AND "confidence_score" <= 1.000);

-- Add foreign keys
ALTER TABLE "risk_profiles"
  ADD CONSTRAINT "risk_profiles_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policies"
  ADD CONSTRAINT "policies_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "claims"
  ADD CONSTRAINT "claims_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "claims_trigger_event_id_fkey"
  FOREIGN KEY ("trigger_event_id") REFERENCES "trigger_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "claims_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fraud_assessments"
  ADD CONSTRAINT "fraud_assessments_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payout_transactions"
  ADD CONSTRAINT "payout_transactions_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "payout_transactions_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
