/**
 * k6 Load Test — Scenario 2: Disruption Peak Load (PRD §39.3.2)
 *
 * Profile: 2,000 concurrent users hitting claims + triggers simultaneously
 * Simulates: Catastrophic event notification → mass user influx
 * Target: p95 < 800ms, error rate < 0.5%, zero 503 errors
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WORKER_JWT = __ENV.WORKER_JWT;

if (!WORKER_JWT) {
  throw new Error('WORKER_JWT environment variable is required');
}

// ── Custom Metrics ────────────────────────────────────────────────────────

const claimsRequests = new Counter('claims_requests_total');
const triggersRequests = new Counter('triggers_requests_total');
const emergencyRequests = new Counter('emergency_requests_total');

const serviceUnavailableErrors = new Counter('service_unavailable_503_total');
const timeoutErrors = new Counter('timeout_errors_total');
const disruption503Rate = new Rate('disruption_503_rate');

const claimsResponseTime = new Trend('claims_response_time', true);
const triggersResponseTime = new Trend('triggers_response_time', true);

// ── Test Configuration ────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '1m', target: 2000 },   // Rapid ramp-up simulating mass notification
    { duration: '10m', target: 2000 },  // Sustained peak load
    { duration: '1m', target: 0 },      // Quick ramp-down
  ],
  thresholds: {
    // Peak load SLA thresholds
    'http_req_duration': ['p(95)<800'],
    'http_req_failed': ['rate<0.005'],  // Error rate < 0.5%

    // Zero tolerance for service unavailable during peak events
    'http_req_failed{status:503}': ['count<1'],
    'service_unavailable_503_total': ['count<1'],
    'disruption_503_rate': ['rate<0.001'],

    // Individual endpoint thresholds
    'claims_response_time': ['p(95)<600'],
    'triggers_response_time': ['p(95)<400'],

    // Timeout tolerance for peak load
    'http_req_duration{scenario:peak}': ['p(99)<1200'],
  },
};

// ── Test Data Pool ────────────────────────────────────────────────────────

const WORKER_IDS = Array.from({ length: 50 }, (_, i) => `peak_test_worker_${String(i + 1).padStart(3, '0')}`);

const TRIGGER_ZONES = [
  'Mumbai_Central', 'Mumbai_Western', 'Mumbai_Eastern',
  'Delhi_North', 'Delhi_South', 'Delhi_Central',
  'Bengaluru_North', 'Bengaluru_South',
  'Hyderabad_Central', 'Pune_Central'
];

// ── Helper Functions ──────────────────────────────────────────────────────

function getRandomWorkerId() {
  return WORKER_IDS[Math.floor(Math.random() * WORKER_IDS.length)];
}

function getRandomZone() {
  return TRIGGER_ZONES[Math.floor(Math.random() * TRIGGER_ZONES.length)];
}

// ── Main Test Function ────────────────────────────────────────────────────

export default function () {
  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
    'Content-Type': 'application/json',
  };

  const workerId = getRandomWorkerId();
  const zone = getRandomZone();

  // Simulate disruption event behavior: users check claims first, then triggers

  // 1. Check Claims (user's primary concern during disruption)
  claimsRequests.add(1);

  const claimsUrl = `${BASE_URL}/api/v1/claims`;
  const claimsResponse = http.get(claimsUrl, {
    headers,
    tags: { endpoint: 'claims', scenario: 'peak' }
  });

  claimsResponseTime.add(claimsResponse.timings.duration);

  // Track 503 errors specifically
  if (claimsResponse.status === 503) {
    serviceUnavailableErrors.add(1);
    disruption503Rate.add(1);
  } else {
    disruption503Rate.add(0);
  }

  check(claimsResponse, {
    'claims not 503 during peak': (r) => r.status !== 503,
    'claims response under 800ms': (r) => r.timings.duration < 800,
    'claims has valid response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return r.status === 200 && body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Short pause (user processing time)
  sleep(0.1 + Math.random() * 0.2);

  // 2. Check Active Triggers (user wants to see current situation)
  triggersRequests.add(1);

  const triggersUrl = `${BASE_URL}/api/v1/triggers/active?zone=${zone}`;
  const triggersResponse = http.get(triggersUrl, {
    headers,
    tags: { endpoint: 'triggers', scenario: 'peak' }
  });

  triggersResponseTime.add(triggersResponse.timings.duration);

  if (triggersResponse.status === 503) {
    serviceUnavailableErrors.add(1);
    disruption503Rate.add(1);
  } else {
    disruption503Rate.add(0);
  }

  check(triggersResponse, {
    'triggers not 503 during peak': (r) => r.status !== 503,
    'triggers response under 600ms': (r) => r.timings.duration < 600,
    'triggers has valid data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return r.status === 200 && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  // Occasionally check emergency contact info
  if (Math.random() < 0.1) {
    emergencyRequests.add(1);

    const helpUrl = `${BASE_URL}/api/v1/policies/emergency-help`;
    const helpResponse = http.get(helpUrl, {
      headers,
      tags: { endpoint: 'emergency', scenario: 'peak' }
    });

    check(helpResponse, {
      'emergency help accessible': (r) => r.status === 200 || r.status === 404,
    });
  }

  // Very short think time during peak consulting
  sleep(0.3 + Math.random() * 0.4);
}

// ── Test Setup ────────────────────────────────────────────────────────────

export function setup() {
  console.log('🚨 Starting DISRUPTION PEAK load test...');
  console.log('📊 Simulating mass user influx after catastrophic event notification');

  // Warm-up request to ensure services are ready
  const warmupResponse = http.get(`${BASE_URL}/internal/ready`);
  if (warmupResponse.status !== 200) {
    console.warn('⚠️  Service not ready for peak load test');
  }

  return {
    startTime: new Date().toISOString(),
  };
}

// ── Test Teardown ─────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('📈 DISRUPTION PEAK test completed');
  console.log(`⏰ Started at: ${data.startTime}`);
}

// ── Test Summary ──────────────────────────────────────────────────────────

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tests/load/results/scenario_2_disruption_peak_${timestamp}.json`;

  const claimsCount = data.metrics.claims_requests_total?.values.count || 0;
  const triggersCount = data.metrics.triggers_requests_total?.values.count || 0;
  const emergencyCount = data.metrics.emergency_requests_total?.values.count || 0;
  const total503s = data.metrics.service_unavailable_503_total?.values.count || 0;

  return {
    [filename]: JSON.stringify(data, null, 2),
    'stdout': `
╭─────────────────────────────────────────────────────────────╮
│                   DISRUPTION PEAK TEST SUMMARY             │
├─────────────────────────────────────────────────────────────┤
│ Max VUs:           ${data.metrics.vus_max.values.max}                                  │
│ Total Requests:    ${data.metrics.http_reqs.values.count}                           │
│ Failed Requests:   ${data.metrics.http_req_failed.values.fails} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)     │
│ 503 Errors:        ${total503s} ❌                               │
│                                                             │
│ Peak Performance:                                           │
│ • p(50):           ${data.metrics.http_req_duration.values.med.toFixed(2)}ms                              │
│ • p(95):           ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms                              │
│ • p(99):           ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms                              │
│                                                             │
│ Request Breakdown:                                          │
│ • Claims Checks:   ${claimsCount}                                 │
│ • Trigger Checks:  ${triggersCount}                                 │
│ • Emergency Help:  ${emergencyCount}                                 │
│                                                             │
│ ${total503s === 0 ? '✅ NO SERVICE UNAVAILABLE ERRORS' : '❌ SERVICE DEGRADATION DETECTED'}               │
│ ${data.metrics.http_req_duration.values['p(95)'] < 800 ? '✅ p95 UNDER 800ms TARGET' : '❌ p95 EXCEEDED TARGET'}      │
╰─────────────────────────────────────────────────────────────╯
    `,
  };
}