/**
 * k6 Load Test — Scenario 3: Stress Breakpoint Discovery (PRD §39.3.3)
 *
 * Profile: Progressive ramp 100 → 5,000 VUs over 20 minutes
 * Purpose: Identify exact breaking points for capacity planning
 * Metrics: Find VU count where p95 > 400ms OR error rate > 1%
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

const breakpointMetrics = {
  // Performance degradation tracking
  responseDegradation: new Rate('response_degradation_rate'),
  errorSpike: new Rate('error_spike_rate'),

  // Breaking point indicators
  p95Threshold: new Rate('p95_exceeds_400ms'),
  errorRateThreshold: new Rate('error_rate_exceeds_1pct'),

  // Resource exhaustion signals
  timeoutRate: new Rate('timeout_rate'),
  connectionErrors: new Counter('connection_errors_total'),

  // Endpoint-specific stress metrics
  pricingStress: new Trend('pricing_stress_response_time', true),
  claimsStress: new Trend('claims_stress_response_time', true),
  payoutStress: new Trend('payout_stress_response_time', true),
  adminStress: new Trend('admin_stress_response_time', true),
};

// ── Test Configuration ────────────────────────────────────────────────────

export const options = {
  stages: [
    // Progressive stress escalation
    { duration: '2m', target: 100 },   // Baseline
    { duration: '3m', target: 300 },   // Light load
    { duration: '3m', target: 600 },   // Medium load
    { duration: '4m', target: 1200 },  // Heavy load
    { duration: '4m', target: 2500 },  // Very heavy load
    { duration: '4m', target: 5000 },  // Extreme load
    { duration: '5m', target: 5000 },  // Sustained extreme
    { duration: '2m', target: 0 },     // Recovery
  ],

  // No hard thresholds — we WANT to observe failure
  thresholds: {
    // These are for reporting only, not hard failures
    'http_req_duration': ['p(95)<2000'],  // Extended for stress testing
    'http_req_failed': ['rate<0.05'],     // Allow up to 5% error rate
  },

  // Increased timeouts for stress conditions
  httpTimeout: '30s',
  noConnectionReuse: false,
  noVUConnectionReuse: false,

  // Resource limits
  maxRedirects: 4,
  batch: 10,
  batchPerHost: 5,
};

// ── Test Data Pool ────────────────────────────────────────────────────────

const STRESS_TEST_WORKERS = Array.from({ length: 200 }, (_, i) =>
  `stress_worker_${String(i + 1).padStart(3, '0')}`
);

const TEST_ENDPOINTS = [
  { path: '/api/v1/pricing', method: 'POST', weight: 0.30 },
  { path: '/api/v1/claims', method: 'GET', weight: 0.25 },
  { path: '/api/v1/payouts', method: 'GET', weight: 0.20 },
  { path: '/api/v1/policies', method: 'GET', weight: 0.15 },
  { path: '/api/v1/triggers/active', method: 'GET', weight: 0.10 },
];

// ── Breaking Point Detection ──────────────────────────────────────────────

let lastKnownGoodVUs = 0;
let p95BreakpointVUs = 0;
let errorBreakpointVUs = 0;

function detectBreakpoint() {
  const currentVUs = __VU;

  // This is a simplified detection — in real implementation,
  // you'd need to track metrics over time windows

  return {
    vus: currentVUs,
    timestamp: new Date().toISOString(),
    metrics: {
      // These would be calculated from rolling windows
      currentP95: 0, // Placeholder
      currentErrorRate: 0, // Placeholder
    }
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────

function getRandomWorker() {
  return STRESS_TEST_WORKERS[Math.floor(Math.random() * STRESS_TEST_WORKERS.length)];
}

function getRandomEndpoint() {
  const rand = Math.random();
  let cumWeight = 0;

  for (const endpoint of TEST_ENDPOINTS) {
    cumWeight += endpoint.weight;
    if (rand <= cumWeight) {
      return endpoint;
    }
  }

  return TEST_ENDPOINTS[0];
}

function executeRequest(endpoint, workerId) {
  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
    'Content-Type': 'application/json',
  };

  const startTime = Date.now();
  let response;
  let errorOccurred = false;

  try {
    const fullUrl = `${BASE_URL}${endpoint.path}`;

    if (endpoint.method === 'GET') {
      response = http.get(fullUrl, { headers, timeout: '10s' });
    } else if (endpoint.method === 'POST') {
      const payload = JSON.stringify({
        worker_id: workerId,
        plan_variant: 'standard',
        avg_daily_hours: 8,
        avg_weekly_earnings: 5000,
      });

      response = http.post(fullUrl, payload, { headers, timeout: '10s' });
    }

    const duration = Date.now() - startTime;

    // Track breaking points
    if (duration > 400) {
      breakpointMetrics.p95Threshold.add(1);
    } else {
      breakpointMetrics.p95Threshold.add(0);
    }

    if (response.status >= 400) {
      errorOccurred = true;
      breakpointMetrics.errorSpike.add(1);

      if (response.status >= 500) {
        breakpointMetrics.connectionErrors.add(1);
      }
    } else {
      breakpointMetrics.errorSpike.add(0);
    }

    // Record endpoint-specific stress metrics
    switch (endpoint.path) {
      case '/api/v1/pricing':
        breakpointMetrics.pricingStress.add(duration);
        break;
      case '/api/v1/claims':
        breakpointMetrics.claimsStress.add(duration);
        break;
      case '/api/v1/payouts':
        breakpointMetrics.payoutStress.add(duration);
        break;
      default:
        breakpointMetrics.adminStress.add(duration);
    }

  } catch (error) {
    errorOccurred = true;
    breakpointMetrics.connectionErrors.add(1);
    breakpointMetrics.timeoutRate.add(1);

    console.error(`Request failed: ${error}}`);
  }

  return { response, errorOccurred };
}

// ── Main Test Function ────────────────────────────────────────────────────

export default function () {
  const workerId = getRandomWorker();
  const endpoint = getRandomEndpoint();

  const { response, errorOccurred } = executeRequest(endpoint, workerId);

  // Check performance and reliability under stress
  if (response) {
    check(response, {
      'request completed': (r) => r !== undefined,
      'status not 503': (r) => r.status !== 503, // Service unavailable
      'status not 502': (r) => r.status !== 502, // Bad gateway
      'response time reasonable': (r) => r.timings.duration < 5000, // 5s max
    });
  }

  // Adaptive sleep based on current load
  const currentVUs = __VU;
  let sleepTime = 1.0;

  if (currentVUs > 2000) {
    sleepTime = 0.1; // High stress, minimal think time
  } else if (currentVUs > 1000) {
    sleepTime = 0.3; // Medium stress
  } else if (currentVUs > 500) {
    sleepTime = 0.5; // Light stress
  }

  sleep(sleepTime);
}

// ── Test Setup ────────────────────────────────────────────────────────────

export function setup() {
  console.log('🔧 Starting STRESS BREAKPOINT discovery test...');
  console.log('📈 Progressive load: 100 → 5,000 VUs over 20 minutes');
  console.log('🎯 Finding breaking points for capacity planning');

  return {
    startTime: new Date().toISOString(),
    testPhase: 'stress_discovery',
  };
}

// ── Test Teardown ─────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('📊 STRESS BREAKPOINT test completed');
  console.log('🔍 Analyze results for capacity breaking points:');
  console.log('   1. VU count where p95 first exceeds 400ms');
  console.log('   2. VU count where error rate first exceeds 1%');
  console.log('   3. Resource exhaustion patterns');
}

// ── Test Summary ──────────────────────────────────────────────────────────

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `tests/load/results/scenario_3_stress_breakpoint_${timestamp}.json`;
  const analysisFile = `tests/load/results/stress_breakpoint_analysis_${timestamp}.md`;

  const maxVUs = data.metrics.vus_max.values.max;
  const totalRequests = data.metrics.http_reqs.values.count;
  const p95Duration = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate;
  const connectionErrors = data.metrics.connection_errors_total?.values.count || 0;

  const breakpointAnalysis = `
# Stress Breakpoint Analysis

**Test Execution:** ${timestamp}

## Key Findings

- **Maximum VUs Tested:** ${maxVUs}
- **Total Requests:** ${totalRequests}
- **Final p95 Response Time:** ${p95Duration.toFixed(2)}ms
- **Final Error Rate:** ${(errorRate * 100).toFixed(2)}%
- **Connection Errors:** ${connectionErrors}

## Breaking Points to Investigate

### Performance Degradation
${p95Duration > 400 ? `⚠️ **p95 exceeded 400ms** at final load (${p95Duration.toFixed(2)}ms)` : `✅ p95 stayed under 400ms (${p95Duration.toFixed(2)}ms)`}

### Error Rate Threshold
${errorRate > 0.01 ? `⚠️ **Error rate exceeded 1%** at final load (${(errorRate * 100).toFixed(2)}%)` : `✅ Error rate stayed under 1% (${(errorRate * 100).toFixed(2)}%)`}

### Resource Exhaustion
${connectionErrors > 0 ? `⚠️ **${connectionErrors} connection errors** detected` : '✅ No connection errors detected'}

## Recommendations

1. **Optimal VU Capacity:** Analyze the detailed results to find the highest VU count before degradation
2. **Horizontal Scaling:** Consider auto-scaling triggers based on observed breaking points
3. **Resource Monitoring:** Set up alerts at 80% of discovered capacity limits
4. **Circuit Breakers:** Implement protection at identified stress thresholds

## Next Steps

- Review detailed metrics in ${resultsFile}
- Set production monitoring alerts at 80% of breaking point capacity
- Implement auto-scaling policies based on these findings
- Schedule regular stress tests to validate capacity assumptions

---
*Generated by Suraksha Load Testing Suite*
  `;

  return {
    [resultsFile]: JSON.stringify(data, null, 2),
    [analysisFile]: breakpointAnalysis,
    'stdout': `
╭─────────────────────────────────────────────────────────────╮
│                   STRESS BREAKPOINT TEST SUMMARY           │
├─────────────────────────────────────────────────────────────┤
│ Max VUs Reached:   ${maxVUs}                                    │
│ Total Requests:    ${totalRequests}                            │
│ Connection Errors: ${connectionErrors}                                    │
│                                                             │
│ Final Performance:                                          │
│ • p(50):           ${data.metrics.http_req_duration.values.med.toFixed(2)}ms                              │
│ • p(95):           ${p95Duration.toFixed(2)}ms                              │
│ • p(99):           ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms                              │
│ • Error Rate:      ${(errorRate * 100).toFixed(2)}%                             │
│                                                             │
│ Breaking Point Analysis:                                    │
│ ${p95Duration > 400 ? '⚠️ p95 EXCEEDED 400ms THRESHOLD' : '✅ p95 WITHIN ACCEPTABLE RANGE'}                │
│ ${errorRate > 0.01 ? '⚠️ ERROR RATE EXCEEDED 1% THRESHOLD' : '✅ ERROR RATE ACCEPTABLE'}                   │
│ ${connectionErrors > 0 ? '⚠️ CONNECTION ERRORS DETECTED' : '✅ NO CONNECTION ISSUES'}                      │
│                                                             │
│ 📊 Detailed analysis saved to:                              │
│    ${analysisFile}  │
╰─────────────────────────────────────────────────────────────╯
    `,
  };
}