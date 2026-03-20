/**
 * k6 Load Test — Scenario 1: Baseline Normal Load (PRD §39.3.1)
 *
 * Profile: 500 concurrent users, 15-minute steady state
 * Mix: 40% pricing quotes, 30% claims, 20% payouts, 10% triggers
 * Target: p95 < 400ms, error rate < 0.1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WORKER_JWT = __ENV.WORKER_JWT;
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN;

if (!WORKER_JWT) {
  throw new Error('WORKER_JWT environment variable is required');
}

// ── Custom Metrics ────────────────────────────────────────────────────────

const quotingRequests = new Counter('quoting_requests_total');
const claimsRequests = new Counter('claims_requests_total');
const payoutRequests = new Counter('payout_requests_total');
const triggerRequests = new Counter('trigger_requests_total');

const quotingResponseTime = new Trend('quoting_response_time', true);
const claimsResponseTime = new Trend('claims_response_time', true);
const payoutResponseTime = new Trend('payout_response_time', true);
const triggerResponseTime = new Trend('trigger_response_time', true);

const errorRate = new Rate('error_rate');

// ── Test Configuration ────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '5m', target: 500 },   // Ramp up to 500 VUs over 5 minutes
    { duration: '15m', target: 500 },  // Steady state at 500 VUs for 15 minutes
    { duration: '2m', target: 0 },     // Ramp down to 0 VUs over 2 minutes
  ],
  thresholds: {
    // Primary SLA thresholds
    'http_req_duration{endpoint:pricing}': ['p(95)<400'],
    'http_req_duration{endpoint:claims}': ['p(95)<400'],
    'http_req_duration{endpoint:payouts}': ['p(95)<400'],
    'http_req_duration{endpoint:triggers}': ['p(95)<400'],

    // Overall error rate must be < 0.1%
    'http_req_failed': ['rate<0.001'],

    // No 5xx errors allowed
    'http_req_failed{status:5xx}': ['count<1'],

    // Rate limiting should be rare under normal load
    'http_req_failed{status:429}': ['count<10'],

    // Custom metric thresholds
    'quoting_response_time': ['p(95)<300'],
    'claims_response_time': ['p(95)<400'],
    'error_rate': ['rate<0.001'],
  },
};

// ── Test Data Pool ────────────────────────────────────────────────────────

const WORKER_IDS = [
  'load_test_worker_001',
  'load_test_worker_002',
  'load_test_worker_003',
  'load_test_worker_004',
  'load_test_worker_005',
];

const PLAN_VARIANTS = ['basic', 'standard', 'pro'];
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune'];

// ── Helper Functions ──────────────────────────────────────────────────────

function getRandomWorkerId() {
  return WORKER_IDS[Math.floor(Math.random() * WORKER_IDS.length)];
}

function getRandomPlan() {
  return PLAN_VARIANTS[Math.floor(Math.random() * PLAN_VARIANTS.length)];
}

function getRandomCity() {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

function makeRequest(method, url, payload, headers, tags) {
  const startTime = new Date();
  let response;

  if (method === 'GET') {
    response = http.get(url, { headers, tags });
  } else if (method === 'POST') {
    response = http.post(url, payload, { headers, tags });
  }

  const duration = new Date() - startTime;

  // Record error if request failed
  errorRate.add(response.status >= 400);

  return response;
}

// ── Main Test Function ────────────────────────────────────────────────────

export default function () {
  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
    'Content-Type': 'application/json',
  };

  const workerId = getRandomWorkerId();
  const scenario = Math.random();

  if (scenario < 0.40) {
    // 40% — Pricing Quotes
    quotingRequests.add(1);

    const plan = getRandomPlan();
    const city = getRandomCity();
    const url = `${BASE_URL}/api/v1/pricing?plan_variant=${plan}&city=${city}`;

    const response = makeRequest('POST', url, JSON.stringify({
      avg_daily_hours: 8 + Math.random() * 4,
      avg_weekly_earnings: 4000 + Math.random() * 3000,
      platform_type: Math.random() > 0.5 ? 'Zomato' : 'Swiggy',
    }), headers, { endpoint: 'pricing' });

    quotingResponseTime.add(response.timings.duration);

    check(response, {
      'pricing quote status 200': (r) => r.status === 200,
      'pricing quote has premium': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && typeof body.data.weekly_premium === 'number';
        } catch {
          return false;
        }
      },
    });

  } else if (scenario < 0.70) {
    // 30% — Claims List
    claimsRequests.add(1);

    const url = `${BASE_URL}/api/v1/claims`;
    const response = makeRequest('GET', url, null, headers, { endpoint: 'claims' });

    claimsResponseTime.add(response.timings.duration);

    check(response, {
      'claims list status 200': (r) => r.status === 200,
      'claims list has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

  } else if (scenario < 0.90) {
    // 20% — Payout History
    payoutRequests.add(1);

    const url = `${BASE_URL}/api/v1/payouts`;
    const response = makeRequest('GET', url, null, headers, { endpoint: 'payouts' });

    payoutResponseTime.add(response.timings.duration);

    check(response, {
      'payouts list status 200': (r) => r.status === 200,
      'payouts list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        } catch {
          return false;
        }
      },
    });

  } else {
    // 10% — Active Triggers
    triggerRequests.add(1);

    const url = `${BASE_URL}/api/v1/triggers/active`;
    const response = makeRequest('GET', url, null, headers, { endpoint: 'triggers' });

    triggerResponseTime.add(response.timings.duration);

    check(response, {
      'triggers list status 200': (r) => r.status === 200,
      'triggers list has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
  }

  // Simulate user think time between requests
  sleep(1 + Math.random() * 2);
}

// ── Test Lifecycle ────────────────────────────────────────────────────────

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tests/load/results/scenario_1_baseline_${timestamp}.json`;

  return {
    [filename]: JSON.stringify(data, null, 2),
    'stdout': `
╭─────────────────────────────────────────────────────────────╮
│                    BASELINE LOAD TEST SUMMARY              │
├─────────────────────────────────────────────────────────────┤
│ Max VUs:           ${data.metrics.vus_max.values.max}                                   │
│ Total Requests:    ${data.metrics.http_reqs.values.count}                            │
│ Failed Requests:   ${data.metrics.http_req_failed.values.fails} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)     │
│                                                             │
│ Response Times:                                             │
│ • p(50):           ${data.metrics.http_req_duration.values.med.toFixed(2)}ms                              │
│ • p(95):           ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms                              │
│ • p(99):           ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms                              │
│                                                             │
│ Request Breakdown:                                          │
│ • Pricing:         ${data.metrics.quoting_requests_total ? data.metrics.quoting_requests_total.values.count : 0}                                 │
│ • Claims:          ${data.metrics.claims_requests_total ? data.metrics.claims_requests_total.values.count : 0}                                 │
│ • Payouts:         ${data.metrics.payout_requests_total ? data.metrics.payout_requests_total.values.count : 0}                                 │
│ • Triggers:        ${data.metrics.trigger_requests_total ? data.metrics.trigger_requests_total.values.count : 0}                                 │
╰─────────────────────────────────────────────────────────────╯
    `,
  };
}