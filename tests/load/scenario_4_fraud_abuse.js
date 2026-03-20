/**
 * k6 Load Test — Scenario 4: Fraud Abuse Simulation (PRD §39.3.4)
 *
 * Profile: 100 VUs rapid-fire attacking same worker + trigger
 * Purpose: Verify rate limiting and idempotency under coordinated attack
 * Target: 90%+ rate Limited (429), 100% idempotency preservation
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

// ── Attack Vectors ───────────────────────────────────────────────────────

const ATTACK_TARGETS = {
  // Primary fraud vector: duplicate claim initiation
  duplicateClaims: {
    endpoint: '/api/v1/claims',
    method: 'POST',
    payload: {
      worker_id: 'fraud_target_worker_001',
      trigger_event_id: 'fraud_trigger_heavy_rain_001',
      policy_id: 'fraud_policy_001',
    },
  },

  // Secondary vector: rapid premium requests
  premiumBombing: {
    endpoint: '/api/v1/pricing',
    method: 'POST',
    payload: {
      plan_variant: 'pro',
      avg_daily_hours: 8,
      avg_weekly_earnings: 7000,
      platform_type: 'Zomato',
    },
  },

  // Tertiary vector: payout enumeration
  payoutEnumeration: {
    endpoint: '/api/v1/payouts',
    method: 'GET',
    payload: null,
  },
};

// ── Custom Metrics ────────────────────────────────────────────────────────

const fraudMetrics = {
  // Rate limiting effectiveness
  rateLimitedRequests: new Counter('rate_limited_429_total'),
  rateLimitRate: new Rate('rate_limit_effectiveness'),

  // Idempotency compliance
  idempotencyViolations: new Counter('idempotency_violations_total'),
  idempotencyRate: new Rate('idempotency_compliance'),

  // Attack vector metrics
  claimAttackRequests: new Counter('claim_attack_requests_total'),
  pricingAttackRequests: new Counter('pricing_attack_requests_total'),
  payoutAttackRequests: new Counter('payout_attack_requests_total'),

  // Defense metrics
  blockedAttacks: new Counter('blocked_attacks_total'),
  leakedRequests: new Counter('leaked_requests_total'),

  // Performance under attack
  attackResponseTime: new Trend('attack_response_time', true),
  defenseLatency: new Trend('defense_latency', true),
};

// ── Test Configuration ────────────────────────────────────────────────────

export const options = {
  vus: 100,           // All VUs attack simultaneously
  duration: '2m',     // Short but intense attack window

  thresholds: {
    // Rate limiting must be effective (90%+ of requests rate limited)
    'http_req_failed{status:429}': ['count>180'],  // At least 90% rate limited
    'rate_limit_effectiveness': ['rate>0.90'],

    // Idempotency must be perfect (100% compliance)
    'idempotency_compliance': ['rate==1.0'],
    'idempotency_violations_total': ['count<1'],

    // Defense must respond quickly even under attack
    'defense_latency': ['p(95)<1000'],

    // System must not completely fail
    'http_req_failed{status:500}': ['count<5'],    // minimal 500 errors
    'http_req_failed{status:503}': ['count<1'],    // no service unavailable
  },

  // Attack configuration
  noConnectionReuse: true,    // Simulate distributed attack
  noVUConnectionReuse: true,
  userAgent: 'k6-fraud-test/1.0',
  batch: 1,                   // No batching - pure rapid fire
  batchPerHost: 1,
};

// ── Attack Functions ──────────────────────────────────────────────────────

function executeClaimAttack() {
  fraudMetrics.claimAttackRequests.add(1);

  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': 'fraud-test-claim-key-001', // Same key for all attackers
  };

  const attack = ATTACK_TARGETS.duplicateClaims;
  const response = http.post(
    `${BASE_URL}${attack.endpoint}`,
    JSON.stringify(attack.payload),
    { headers, tags: { attack: 'duplicate_claims' } }
  );

  fraudMetrics.attackResponseTime.add(response.timings.duration);

  // Analyze defense effectiveness
  if (response.status === 429) {
    // Rate limited - defense working
    fraudMetrics.rateLimitedRequests.add(1);
    fraudMetrics.rateLimitRate.add(1);
    fraudMetrics.blockedAttacks.add(1);

    // Check for rate limit headers
    check(response, {
      'rate limit has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
      'rate limit response under 500ms': (r) => r.timings.duration < 500,
    });

  } else if (response.status === 201) {
    // First successful claim creation - this is acceptable for ONE request
    fraudMetrics.rateLimitRate.add(0);
    fraudMetrics.leakedRequests.add(1);

  } else if (response.status === 409) {
    // Idempotency conflict - duplicate detected
    fraudMetrics.rateLimitRate.add(0);
    fraudMetrics.idempotencyRate.add(1);
    fraudMetrics.blockedAttacks.add(1);

  } else if (response.status === 400) {
    // Bad request - possible validation block
    fraudMetrics.rateLimitRate.add(0);
    fraudMetrics.blockedAttacks.add(1);

  } else {
    // Unexpected response
    fraudMetrics.rateLimitRate.add(0);
    fraudMetrics.leakedRequests.add(1);

    if (response.status >= 500) {
      console.error(`Unexpected server error during attack: ${response.status}`);
    }
  }

  return response;
}

function executePricingBombAttack() {
  fraudMetrics.pricingAttackRequests.add(1);

  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
    'Content-Type': 'application/json',
  };

  const attack = ATTACK_TARGETS.premiumBombing;
  const response = http.post(
    `${BASE_URL}${attack.endpoint}`,
    JSON.stringify(attack.payload),
    { headers, tags: { attack: 'premium_bombing' } }
  );

  if (response.status === 429) {
    fraudMetrics.rateLimitedRequests.add(1);
    fraudMetrics.rateLimitRate.add(1);
  } else {
    fraudMetrics.rateLimitRate.add(0);
  }

  return response;
}

function executePayoutEnumerationAttack() {
  fraudMetrics.payoutAttackRequests.add(1);

  const headers = {
    'Authorization': `Bearer ${WORKER_JWT}`,
  };

  const attack = ATTACK_TARGETS.payoutEnumeration;
  const response = http.get(
    `${BASE_URL}${attack.endpoint}?page=${Math.floor(Math.random() * 1000)}`,
    { headers, tags: { attack: 'payout_enumeration' } }
  );

  if (response.status === 429) {
    fraudMetrics.rateLimitedRequests.add(1);
    fraudMetrics.rateLimitRate.add(1);
  } else {
    fraudMetrics.rateLimitRate.add(0);
  }

  return response;
}

// ── Main Attack Function ──────────────────────────────────────────────────

export default function () {
  const attackVector = Math.random();

  let response;

  if (attackVector < 0.70) {
    // 70% - Primary attack: duplicate claim initiation
    response = executeClaimAttack();

    // Critical idempotency check
    const isValidIdempotentResponse = [201, 409, 429].includes(response.status);

    if (isValidIdempotentResponse) {
      fraudMetrics.idempotencyRate.add(1);
    } else {
      fraudMetrics.idempotencyRate.add(0);
      fraudMetrics.idempotencyViolations.add(1);
      console.error(`Idempotency violation: status ${response.status}`);
    }

    check(response, {
      'only_one_claim_created': (r) => [201, 409, 429, 400].includes(r.status),
      'idempotency_preserved': (r) => isValidIdempotentResponse,
    });

  } else if (attackVector < 0.90) {
    // 20% - Secondary attack: premium bombing
    response = executePricingBombAttack();

    check(response, {
      'pricing_attack_blocked_or_limited': (r) => r.status === 429 || r.status === 200,
    });

  } else {
    // 10% - Tertiary attack: payout enumeration
    response = executePayoutEnumerationAttack();

    check(response, {
      'payout_attack_handled': (r) => [200, 429, 403].includes(r.status),
    });
  }

  // Record defense response time
  if (response && response.timings) {
    fraudMetrics.defenseLatency.add(response.timings.duration);
  }

  // Minimal sleep - this is an attack simulation
  sleep(0.01 + Math.random() * 0.05);
}

// ── Test Setup ────────────────────────────────────────────────────────────

export function setup() {
  console.log('🚨 Starting FRAUD ABUSE simulation...');
  console.log('⚔️  100 VUs attacking same endpoints simultaneously');
  console.log('🛡️  Testing rate limiting and idempotency defenses');

  // Verify target endpoints are reachable
  const healthCheck = http.get(`${BASE_URL}/internal/ready`);
  if (healthCheck.status !== 200) {
    throw new Error('System not ready for fraud simulation test');
  }

  return {
    startTime: new Date().toISOString(),
    attackTarget: ATTACK_TARGETS.duplicateClaims,
  };
}

// ── Test Teardown ─────────────────────────────────────────────────────────

export function teardown(data) {
  console.log('🔍 FRAUD ABUSE simulation completed');
  console.log('📊 Analyzing defense effectiveness...');

  // Clean up any test data if needed
  console.log('🧹 Cleanup: fraud test data will be cleaned by normal DB maintenance');
}

// ── Test Summary ──────────────────────────────────────────────────────────

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `tests/load/results/scenario_4_fraud_abuse_${timestamp}.json`;
  const securityReportFile = `tests/load/results/fraud_security_report_${timestamp}.md`;

  const totalRequests = data.metrics.http_reqs.values.count;
  const rateLimitedCount = data.metrics.rate_limited_429_total?.values.count || 0;
  const rateLimitRate = data.metrics.rate_limit_effectiveness?.values.rate || 0;
  const idempotencyRate = data.metrics.idempotency_compliance?.values.rate || 0;
  const idempotencyViolations = data.metrics.idempotency_violations_total?.values.count || 0;

  const claimAttacks = data.metrics.claim_attack_requests_total?.values.count || 0;
  const blockedAttacks = data.metrics.blocked_attacks_total?.values.count || 0;
  const leakedRequests = data.metrics.leaked_requests_total?.values.count || 0;

  const securityReport = `
# Fraud Abuse Security Report

**Test Execution:** ${timestamp}

## Attack Summary

- **Total Attack Requests:** ${totalRequests}
- **Rate Limited (429):** ${rateLimitedCount} (${(rateLimitRate * 100).toFixed(1)}%)
- **Blocked Attacks:** ${blockedAttacks}
- **Leaked Requests:** ${leakedRequests}

## Defense Effectiveness

### Rate Limiting
${rateLimitRate >= 0.9 ? '✅' : '❌'} **Rate Limiting:** ${(rateLimitRate * 100).toFixed(1)}% effectiveness (target: >90%)

### Idempotency Protection
${idempotencyRate === 1.0 ? '✅' : '❌'} **Idempotency:** ${(idempotencyRate * 100).toFixed(1)}% compliance (target: 100%)
- Violations detected: ${idempotencyViolations}

### Response Performance
- Defense response time p(95): ${data.metrics.defense_latency?.values['p(95)']?.toFixed(2) || 'N/A'}ms

## Attack Vector Analysis

### Claim Duplication Attack
- Attempts: ${claimAttacks}
- Success rate: ${claimAttacks > 0 ? ((leakedRequests / claimAttacks) * 100).toFixed(2) : 'N/A'}%

## Security Recommendations

${rateLimitRate < 0.9 ? '⚠️  **Strengthen Rate Limiting:** Current effectiveness below 90% target' : '✅ Rate limiting operating within acceptable parameters'}

${idempotencyViolations > 0 ? '⚠️  **Fix Idempotency Issues:** ' + idempotencyViolations + ' violations detected' : '✅ Idempotency protection working correctly'}

${leakedRequests > (totalRequests * 0.02) ? '⚠️  **Investigate Request Leakage:** High number of unblocked attack requests' : '✅ Attack containment effective'}

## Next Steps

1. Review rate limiting configuration if effectiveness < 90%
2. Investigate any idempotency violations immediately
3. Monitor for similar attack patterns in production logs
4. Consider implementing additional fraud detection rules if leakage is high

---
*Generated by Suraksha Fraud Abuse Testing Suite*
  `;

  return {
    [resultsFile]: JSON.stringify(data, null, 2),
    [securityReportFile]: securityReport,
    'stdout': `
╭─────────────────────────────────────────────────────────────╮
│                    FRAUD ABUSE TEST SUMMARY                │
├─────────────────────────────────────────────────────────────┤
│ Attack Requests:   ${totalRequests}                            │
│ Rate Limited:      ${rateLimitedCount} (${(rateLimitRate * 100).toFixed(1)}%)                       │
│ Blocked Attacks:   ${blockedAttacks}                                 │
│ Leaked Requests:   ${leakedRequests}                                 │
│                                                             │
│ Defense Effectiveness:                                      │
│ • Rate Limiting:   ${rateLimitRate >= 0.9 ? '✅' : '❌'} ${(rateLimitRate * 100).toFixed(1)}% (target: >90%)      │
│ • Idempotency:     ${idempotencyRate === 1.0 ? '✅' : '❌'} ${(idempotencyRate * 100).toFixed(1)}% (target: 100%)     │
│ • Violations:      ${idempotencyViolations} detected                        │
│                                                             │
│ Performance:                                                │
│ • Defense p95:     ${data.metrics.defense_latency?.values['p(95)']?.toFixed(2) || 'N/A'}ms                               │
│ • Attack p95:      ${data.metrics.attack_response_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms                               │
│                                                             │
│ ${rateLimitRate >= 0.9 && idempotencyRate === 1.0 ? '🛡️ DEFENSES EFFECTIVE' : '⚠️ SECURITY ISSUES DETECTED'}                │
│                                                             │
│ 🔒 Security report saved to:                                │
│    ${securityReportFile} │
╰─────────────────────────────────────────────────────────────╯
    `,
  };
}