INSERT INTO workers (id, phone, city, zone, account_age_days, active_hours_14d, payout_account_verified, location_consistency, trust_score)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '9999999999',
  'Bengaluru',
  'Koramangala',
  60,
  52,
  TRUE,
  0.88,
  760
)
ON CONFLICT (phone) DO NOTHING;
