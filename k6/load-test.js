import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<400", "p(99)<1200"],
    http_req_failed: ["rate<0.02"]
  },
  scenarios: {
    probes_baseline: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 0 }
      ],
      exec: "runProbeTraffic"
    },
    worker_flow_smoke: {
      executor: "constant-vus",
      vus: 10,
      duration: "2m",
      exec: "runWorkerFlow"
    },
    rate_limit_stress: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1s",
      duration: "90s",
      preAllocatedVUs: 40,
      maxVUs: 80,
      exec: "runRateLimitStress"
    },
    rollback_readiness_smoke: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 20,
      maxDuration: "2m",
      exec: "runRollbackReadinessSmoke"
    },
    degraded_resilience_smoke: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 20,
      maxDuration: "2m",
      exec: "runDegradedResilienceSmoke"
    }
  }
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";

function asJson(response) {
  try {
    return response.json();
  } catch {
    return {};
  }
}

export function runProbeTraffic() {
  const live = http.get(`${baseUrl}/internal/live`);
  const ready = http.get(`${baseUrl}/internal/ready`);
  const startup = http.get(`${baseUrl}/internal/startup`);
  const metrics = http.get(`${baseUrl}/internal/metrics`);

  check(live, { "live 200": (r) => r.status === 200 });
  check(ready, { "ready 200": (r) => r.status === 200 });
  check(startup, { "startup 200": (r) => r.status === 200 });
  check(metrics, {
    "metrics 200": (r) => r.status === 200,
    "metrics payload": (r) => typeof asJson(r).metrics?.totalRequests === "number"
  });
  sleep(1);
}

export function runWorkerFlow() {
  const phone = `9${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0")}`;

  const worker = http.post(`${baseUrl}/api/v1/workers/register`, JSON.stringify({
    phone,
    city: "Bengaluru",
    zone: "HSR",
    accountAgeDays: 90,
    activeHours14d: 70,
    payoutAccountVerified: true,
    locationConsistency: 0.9,
    trustScore: 780
  }), {
    headers: { "content-type": "application/json" }
  });

  const workerPayload = asJson(worker);
  check(worker, { "register 201": (r) => r.status === 201 });
  if (!workerPayload.worker?.id) {
    sleep(1);
    return;
  }

  const quote = http.post(`${baseUrl}/api/v1/policies/quote`, JSON.stringify({ workerId: workerPayload.worker.id, plan: "standard" }), {
    headers: { "content-type": "application/json" }
  });
  check(quote, { "quote 200": (r) => r.status === 200 });

  const purchase = http.post(`${baseUrl}/api/v1/policies/purchase`, JSON.stringify({ workerId: workerPayload.worker.id, plan: "standard" }), {
    headers: { "content-type": "application/json" }
  });
  const purchasePayload = asJson(purchase);
  check(purchase, { "purchase 201": (r) => r.status === 201 });

  if (purchasePayload.policy?.id) {
    const claim = http.post(`${baseUrl}/api/v1/claims/initiate`, JSON.stringify({
      workerId: workerPayload.worker.id,
      policyId: purchasePayload.policy.id,
      triggerEventId: `k6-${Date.now()}`,
      requestedAmount: 500
    }), {
      headers: { "content-type": "application/json" }
    });

    check(claim, { "claim accepted": (r) => r.status === 201 || r.status === 202 });
  }

  sleep(0.5);
}

export function runRateLimitStress() {
  const response = http.post(`${baseUrl}/api/v1/auth/otp/request`, JSON.stringify({ phone: "9999999999" }), {
    headers: { "content-type": "application/json" }
  });

  check(response, {
    "otp endpoint bounded": (r) => r.status === 200 || r.status === 429,
    "throttle has retry header": (r) => r.status !== 429 || !!r.headers["Retry-After"]
  });
}

export function runRollbackReadinessSmoke() {
  const buildInfo = http.get(`${baseUrl}/internal/startup`);
  const readiness = http.get(`${baseUrl}/internal/ready`);

  check(buildInfo, { "startup ok": (r) => r.status === 200 });
  check(readiness, {
    "ready ok": (r) => r.status === 200,
    "ready payload": (r) => asJson(r).ready === true
  });
}

export function runDegradedResilienceSmoke() {
  const internalDenied = http.post(`${baseUrl}/api/v1/triggers/ingest`, JSON.stringify({ type: "rain", zone: "HSR" }), {
    headers: { "content-type": "application/json" }
  });

  const metrics = http.get(`${baseUrl}/internal/metrics`);

  check(internalDenied, { "internal auth defended": (r) => r.status === 401 });
  check(metrics, { "metrics still available": (r) => r.status === 200 });
  sleep(0.3);
}

export default function () {
  runProbeTraffic();
}
