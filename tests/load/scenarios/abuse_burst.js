import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const rateLimitEffectiveness = new Rate('rate_limit_effectiveness');
const baselineSla = new Rate('baseline_sla_compliance');

export const options = {
  scenarios: {
    abuse: {
      executor: 'constant-arrival-rate',
      rate: 600,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 300,
      maxVUs: 2000,
      exec: 'abuseFlow',
    },
    baseline_guard: {
      executor: 'constant-vus',
      vus: 120,
      duration: '10m',
      exec: 'baselineFlow',
    },
  },
  thresholds: {
    rate_limit_effectiveness: ['rate>0.95'],
    'http_req_failed{scenario:baseline_guard}': ['rate<0.01'],
    'http_req_duration{scenario:baseline_guard}': ['p(95)<800'],
    baseline_sla_compliance: ['rate>0.99'],
  },
};

export function abuseFlow() {
  const payload = JSON.stringify({ phone: '+919999000001' });
  const res = http.post(`${BASE_URL}/api/v1/auth/request-otp`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'otp_abuse' },
  });

  const limited = res.status === 429;
  rateLimitEffectiveness.add(limited);

  check(res, {
    'abuse request got bounded response': (r) => [200, 429].includes(r.status),
  });

  sleep(0.05);
}

export function baselineFlow() {
  const res = http.get(`${BASE_URL}/internal/ready`, {
    tags: { endpoint: 'baseline_guard' },
  });

  const ok = res.status === 200;
  baselineSla.add(ok);

  check(res, {
    'baseline flow healthy': (r) => r.status === 200,
  });

  sleep(0.2);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  return {
    [`tests/load/results/abuse-burst-${stamp}.json`]: JSON.stringify(data, null, 2),
    [`tests/load/results/abuse-burst-${stamp}.html`]: htmlReport(data),
    stdout: `Abuse burst complete: RL=${((data.metrics.rate_limit_effectiveness?.values?.rate || 0) * 100).toFixed(2)}%, baseline p95=${(data.metrics['http_req_duration{scenario:baseline_guard}']?.values?.['p(95)'] || 0).toFixed(2)}ms\n`,
  };
}
