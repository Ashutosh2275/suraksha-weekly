import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WORKER_JWT = __ENV.WORKER_JWT || '';
const RECOVERY_START_TS = parseInt(__ENV.RECOVERY_START_TS || '0', 10);

const duplicatePayoutFree = new Rate('duplicate_payout_free');
const recoveryLatency = new Trend('recovery_latency_ms', true);

export const options = {
  stages: [
    { duration: '2m', target: 300 },
    { duration: '2m', target: 800 },
    { duration: '1m', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    duplicate_payout_free: ['rate==1'],
    recovery_latency_ms: ['p(95)<800'],
  },
};

function hasDuplicateClaimIds(payouts) {
  const seen = new Set();
  for (const payout of payouts) {
    if (!payout || !payout.claim_id) {
      continue;
    }
    if (seen.has(payout.claim_id)) {
      return true;
    }
    seen.add(payout.claim_id);
  }
  return false;
}

export default function () {
  const headers = WORKER_JWT ? { Authorization: `Bearer ${WORKER_JWT}` } : {};

  const readyRes = http.get(`${BASE_URL}/internal/ready`, {
    tags: { endpoint: 'readiness' },
  });

  check(readyRes, {
    'readiness endpoint available': (r) => r.status < 500,
  });

  const payoutsRes = http.get(`${BASE_URL}/api/v1/payouts`, {
    headers,
    tags: { endpoint: 'payout_history' },
  });

  let noDupes = true;
  if (payoutsRes.status === 200) {
    const payload = payoutsRes.json() || {};
    const rows = payload.payouts || payload.data || [];
    noDupes = !hasDuplicateClaimIds(rows);
  }

  duplicatePayoutFree.add(noDupes);

  if (RECOVERY_START_TS > 0 && Date.now() >= RECOVERY_START_TS) {
    recoveryLatency.add(readyRes.timings.duration);
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  return {
    [`tests/load/results/recovery-${stamp}.json`]: JSON.stringify(data, null, 2),
    [`tests/load/results/recovery-${stamp}.html`]: htmlReport(data),
    stdout: `Recovery complete: duplicate_free=${((data.metrics.duplicate_payout_free?.values?.rate || 0) * 100).toFixed(2)}%, post-recovery p95=${(data.metrics.recovery_latency_ms?.values?.['p(95)'] || 0).toFixed(2)}ms\n`,
  };
}
