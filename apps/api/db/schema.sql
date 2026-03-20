CREATE TABLE workers (
  id UUID PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  zone TEXT NOT NULL,
  account_age_days INTEGER NOT NULL,
  active_hours_14d INTEGER NOT NULL,
  payout_account_verified BOOLEAN NOT NULL,
  location_consistency NUMERIC(4,3) NOT NULL,
  trust_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_profiles (
  worker_id UUID PRIMARY KEY REFERENCES workers(id),
  phone TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  aadhaar4 TEXT NOT NULL,
  pan4 TEXT NOT NULL,
  rider_id TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  city TEXT NOT NULL,
  zone TEXT NOT NULL,
  service_zones JSONB NOT NULL,
  orders_per_day INTEGER NOT NULL,
  average_daily_online_hours NUMERIC(5,2) NOT NULL,
  active_hours_week NUMERIC(5,2) NOT NULL,
  active_hours_14d INTEGER NOT NULL,
  weekly_income_4w INTEGER NOT NULL,
  average_weekly_earnings INTEGER NOT NULL,
  volatility_band TEXT NOT NULL,
  payout_cycle TEXT NOT NULL,
  cash_share INTEGER NOT NULL,
  digital_share INTEGER NOT NULL,
  nominee TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  bank4 TEXT NOT NULL,
  account_age_days INTEGER NOT NULL,
  location_consistency NUMERIC(4,3) NOT NULL,
  trust_score INTEGER NOT NULL,
  payout_account_verified BOOLEAN NOT NULL,
  kyc_verified BOOLEAN NOT NULL,
  consent_accepted BOOLEAN NOT NULL,
  trigger_disclosure_accepted BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  plan TEXT NOT NULL,
  premium INTEGER NOT NULL,
  weekly_coverage_cap INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE claims (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  trigger_event_id TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  payout_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, policy_id, trigger_event_id)
);

CREATE TABLE payout_transactions (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
