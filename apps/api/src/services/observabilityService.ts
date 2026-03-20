type MethodCounts = Record<string, number>;
type StatusCounts = Record<string, number>;

type RequestMetrics = {
  totalRequests: number;
  totalErrors: number;
  methods: MethodCounts;
  statuses: StatusCounts;
  routes: Record<string, number>;
  averageLatencyMs: number;
  maxLatencyMs: number;
};

const startedAt = Date.now();

const metrics: RequestMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  methods: {},
  statuses: {},
  routes: {},
  averageLatencyMs: 0,
  maxLatencyMs: 0
};

export function resetObservabilityMetrics() {
  metrics.totalRequests = 0;
  metrics.totalErrors = 0;
  metrics.methods = {};
  metrics.statuses = {};
  metrics.routes = {};
  metrics.averageLatencyMs = 0;
  metrics.maxLatencyMs = 0;
}

export function recordRequestMetric(method: string, route: string, statusCode: number, latencyMs: number) {
  metrics.totalRequests += 1;
  if (statusCode >= 500) {
    metrics.totalErrors += 1;
  }

  metrics.methods[method] = (metrics.methods[method] || 0) + 1;
  metrics.statuses[String(statusCode)] = (metrics.statuses[String(statusCode)] || 0) + 1;
  metrics.routes[route] = (metrics.routes[route] || 0) + 1;

  const requestCount = metrics.totalRequests;
  metrics.averageLatencyMs = Number((((metrics.averageLatencyMs * (requestCount - 1)) + latencyMs) / requestCount).toFixed(2));
  metrics.maxLatencyMs = Math.max(metrics.maxLatencyMs, Number(latencyMs.toFixed(2)));
}

export function observabilitySnapshot() {
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    generatedAt: new Date().toISOString(),
    ...metrics
  };
}