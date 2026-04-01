import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const FIXED_WORKER_JWT = __ENV.WORKER_JWT || '';
const BASE_PHONE = parseInt(__ENV.BASE_PHONE || '9000000000', 10);

const journeySuccess = new Rate('journey_success_rate');
const authFailures = new Counter('auth_failures_total');
const quoteFailures = new Counter('quote_failures_total');
const purchaseFailures = new Counter('purchase_failures_total');
const policyStatusFailures = new Counter('policy_status_failures_total');
const payoutHistoryFailures = new Counter('payout_history_failures_total');

let token = FIXED_WORKER_JWT;
let workerId = '';
let policyId = __ENV.POLICY_ID || '';

export const options = {
  stages: [
    { duration: '3m', target: 500 },
    { duration: '15m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.001'],
    journey_success_rate: ['rate>0.98'],
  },
};

function phoneForVu() {
  const local = BASE_PHONE + __VU;
  return `+91${local}`;
}

function authenticate() {
  if (token) {
    return true;
  }

  const phone = phoneForVu();
  const otpPayload = JSON.stringify({ phone });
  const otpRes = http.post(`${BASE_URL}/api/v1/auth/request-otp`, otpPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth_request_otp' },
  });

  if (otpRes.status !== 200) {
    authFailures.add(1);
    return false;
  }

  const verifyPayload = JSON.stringify({
    phone,
    otp: '123456',
    name: `Load Worker ${__VU}`,
    city: 'Mumbai',
    service_zones: ['Andheri', 'Bandra'],
    platform_type: 'Zomato',
    avg_daily_hours: 8,
    avg_weekly_earnings: 5200,
  });

  const verifyRes = http.post(`${BASE_URL}/api/v1/auth/verify-otp`, verifyPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth_verify_otp' },
  });

  if (!(verifyRes.status === 200 || verifyRes.status === 201)) {
    authFailures.add(1);
    return false;
  }

  const data = verifyRes.json('data') || {};
  token = data.token || '';
  const worker = data.worker || {};
  workerId = worker.id || '';

  if (!token) {
    authFailures.add(1);
    return false;
  }

  return true;
}

export default function () {
  const okAuth = authenticate();
  if (!okAuth) {
    journeySuccess.add(false);
    sleep(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const quoteRes = http.post(
    `${BASE_URL}/api/v1/policies/quote`,
    JSON.stringify({ plan_variant: 'standard' }),
    { headers, tags: { endpoint: 'policy_quote' } }
  );
  const quoteOk = quoteRes.status === 200;
  if (!quoteOk) {
    quoteFailures.add(1);
  }

  const quoteId = quoteRes.json('quote_id') || null;
  const purchaseRes = http.post(
    `${BASE_URL}/api/v1/policies/purchase`,
    JSON.stringify({ plan_variant: 'standard', quote_id: quoteId }),
    { headers, tags: { endpoint: 'policy_purchase' } }
  );

  const purchaseOk = purchaseRes.status === 201 || purchaseRes.status === 409;
  if (!purchaseOk) {
    purchaseFailures.add(1);
  }

  if (purchaseRes.status === 201) {
    const newPolicyId = purchaseRes.json('id');
    if (newPolicyId) {
      policyId = newPolicyId;
    }
  }

  let policyOk = false;
  if (policyId) {
    const policyRes = http.get(`${BASE_URL}/api/v1/policies/${policyId}`, {
      headers,
      tags: { endpoint: 'policy_status' },
    });
    policyOk = policyRes.status === 200;
    if (!policyOk) {
      policyStatusFailures.add(1);
    }
  }

  const payoutRes = http.get(`${BASE_URL}/api/v1/payouts`, {
    headers,
    tags: { endpoint: 'payout_history' },
  });
  const payoutOk = payoutRes.status === 200;
  if (!payoutOk) {
    payoutHistoryFailures.add(1);
  }

  check(quoteRes, { 'quote endpoint responded': (r) => r.status < 500 });
  check(purchaseRes, { 'purchase endpoint responded': (r) => r.status < 500 });
  check(payoutRes, { 'payout endpoint responded': (r) => r.status < 500 });

  journeySuccess.add(quoteOk && purchaseOk && (policyOk || !policyId) && payoutOk);

  sleep(1);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  return {
    [`tests/load/results/baseline-${stamp}.json`]: JSON.stringify(data, null, 2),
    [`tests/load/results/baseline-${stamp}.html`]: htmlReport(data),
    stdout: `Baseline complete: p95=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms, errors=${(data.metrics.http_req_failed.values.rate * 100).toFixed(3)}%\n`,
  };
}
