import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'admin-dev-token-12345';
const WORKER_JWT = __ENV.WORKER_JWT || '';

const claimQueueLag = new Trend('claim_queue_lag', true);

export const options = {
  scenarios: {
    disruption_peak: {
      executor: 'shared-iterations',
      vus: 2000,
      iterations: 2000,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.005'],
    'http_req_failed{status:503}': ['count==0'],
    claim_queue_lag: ['p(95)<5000'],
  },
};

export function setup() {
  const seededAt = Date.now();
  const triggerRes = http.post(
    `${BASE_URL}/api/v1/triggers/simulate`,
    JSON.stringify({
      trigger_type: 'HeavyRain',
      zone: 'Andheri',
      city: 'Mumbai',
      value: 12.5,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': ADMIN_TOKEN,
      },
      tags: { endpoint: 'trigger_seed' },
    }
  );

  check(triggerRes, { 'seed trigger created': (r) => r.status === 200 });

  const triggerId = triggerRes.json('trigger_id') || triggerRes.json('id') || '';

  return {
    triggerId,
    seededAt,
    claimId: __ENV.CLAIM_ID || '',
  };
}

export default function (ctx) {
  const authHeaders = WORKER_JWT
    ? { Authorization: `Bearer ${WORKER_JWT}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  if (!WORKER_JWT) {
    const readyRes = http.get(`${BASE_URL}/internal/ready`, { tags: { endpoint: 'ready_probe' } });
    check(readyRes, { 'ready endpoint responds': (r) => r.status < 500 });
    sleep(0.1);
    return;
  }

  const claimId = ctx.claimId;
  let res;
  if (claimId) {
    res = http.get(`${BASE_URL}/api/v1/claims/${claimId}`, {
      headers: authHeaders,
      tags: { endpoint: 'claim_status' },
    });
  } else {
    res = http.get(`${BASE_URL}/api/v1/claims`, {
      headers: authHeaders,
      tags: { endpoint: 'claim_status' },
    });
  }

  check(res, {
    'claim status responds': (r) => r.status === 200 || r.status === 404,
    'no 503 during peak': (r) => r.status !== 503,
  });

  if (res.status === 200) {
    claimQueueLag.add(Date.now() - ctx.seededAt);
  }

  sleep(0.05);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  return {
    [`tests/load/results/peak-disruption-${stamp}.json`]: JSON.stringify(data, null, 2),
    [`tests/load/results/peak-disruption-${stamp}.html`]: htmlReport(data),
    stdout: `Peak disruption complete: p95=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms, err=${(data.metrics.http_req_failed.values.rate * 100).toFixed(3)}%\n`,
  };
}
