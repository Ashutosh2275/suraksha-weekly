# k6 Load Testing Suite — Suraksha Weekly (PRD §39.3)

Comprehensive load testing suite covering all performance scenarios for the Suraksha Weekly parametric insurance platform.

## Overview

This test suite implements 4 distinct load testing scenarios designed to validate performance, reliability, and security under various conditions:

1. **Baseline Normal Load** — Sustained production-equivalent traffic
2. **Disruption Peak Load** — Mass user influx during catastrophic events
3. **Stress Breakpoint Discovery** — Progressive load to identify capacity limits
4. **Fraud Abuse Simulation** — Attack simulation for security validation

## Prerequisites

### Required Tools

- [k6](https://k6.io/docs/getting-started/installation/) v0.43+
- Node.js 18+ (for npm scripts)
- Docker & Docker Compose (for local API)

### Installation

```bash
# Install k6 (macOS/Linux)
brew install k6

# Or download from https://k6.io/docs/getting-started/installation/

# Verify installation
k6 version
```

### Environment Setup

Start the Suraksha API locally:

```bash
# Start full stack
npm run docker:up

# Wait for health checks
curl http://localhost:8000/internal/ready
```

## Test Scenarios

### Scenario 1: Baseline Normal Load

**Purpose:** Validate performance under normal production traffic patterns

```bash
npm run load:baseline
```

**Profile:**
- 500 concurrent users
- 15-minute steady state
- Traffic mix: 40% pricing, 30% claims, 20% payouts, 10% triggers
- **Targets:** p95 < 400ms, error rate < 0.1%

### Scenario 2: Disruption Peak Load

**Purpose:** Test resilience during catastrophic event notifications

```bash
npm run load:peak
```

**Profile:**
- 2,000 concurrent users
- 10-minute sustained peak
- Focus: claims + triggers endpoints (disruption behavior)
- **Targets:** p95 < 800ms, error rate < 0.5%, zero 503 errors

### Scenario 3: Stress Breakpoint Discovery

**Purpose:** Identify exact capacity limits for infrastructure planning

```bash
npm run load:stress
```

**Profile:**
- Progressive ramp: 100 → 5,000 VUs over 20 minutes
- Mixed endpoint traffic
- **Goal:** Find VU count where p95 > 400ms OR error rate > 1%

### Scenario 4: Fraud Abuse Simulation

**Purpose:** Validate rate limiting and idempotency under attack

```bash
npm run load:fraud
```

**Profile:**
- 100 attackers targeting same endpoints
- Rapid-fire duplicate requests
- **Targets:** 90%+ rate limited, 100% idempotency compliance

## Environment Variables

Configure tests via environment variables:

```bash
export BASE_URL=http://localhost:8000
export WORKER_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export ADMIN_TOKEN=admin-dev-token-12345

# Run specific scenario
npm run load:baseline
```

### JWT Token Generation

If you need to generate fresh JWT tokens:

```bash
# Generate via setup script
npm run load:setup

# Or manually via API
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999000001"}'

curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999000001", "otp": "123456"}'
```

## Running Tests

### Individual Scenarios

```bash
# Baseline performance validation
npm run load:baseline

# Peak load simulation
npm run load:peak

# Capacity limit discovery
npm run load:stress

# Security attack simulation
npm run load:fraud
```

### Complete Test Suite

```bash
# Run all scenarios (excluding stress test)
npm run load:all

# CI-friendly subset (baseline + fraud)
npm run load:ci
```

### Custom Parameters

Override test parameters via k6 options:

```bash
# Custom VU count and duration
k6 run tests/load/scenario_1_baseline.js \
  --vus 1000 \
  --duration 30m \
  --env BASE_URL=https://api.suraksha.com \
  --env WORKER_JWT=$JWT_TOKEN
```

## Test Results

### Output Locations

Test results are automatically saved to `tests/load/results/`:

```
tests/load/results/
├── scenario_1_baseline_2024-03-19T10-30-45-123Z.json
├── scenario_2_disruption_peak_2024-03-19T11-15-22-456Z.json
├── scenario_3_stress_breakpoint_2024-03-19T12-00-11-789Z.json
├── stress_breakpoint_analysis_2024-03-19T12-00-11-789Z.md
├── scenario_4_fraud_abuse_2024-03-19T12-30-33-012Z.json
└── fraud_security_report_2024-03-19T12-30-33-012Z.md
```

### Key Metrics

Each test produces detailed metrics including:

- **Response Times:** p50, p95, p99 latencies
- **Error Rates:** Overall and by status code
- **Throughput:** Requests per second
- **Custom Metrics:** Endpoint-specific performance
- **Security Metrics:** Rate limiting effectiveness, idempotency compliance

### Analyzing Results

```bash
# View test summary
cat tests/load/results/scenario_1_baseline_*.json | jq '.metrics.http_req_duration.values'

# Check for breaking points
grep -A 10 "Breaking Point Analysis" tests/load/results/stress_breakpoint_analysis_*.md

# Review security effectiveness
grep -A 5 "Defense Effectiveness" tests/load/results/fraud_security_report_*.md
```

## Performance Targets

### Production SLA Thresholds

| Metric | Baseline | Peak Load | Stress Test |
|--------|----------|-----------|-------------|
| p95 Response Time | < 400ms | < 800ms | Observe failure point |
| Error Rate | < 0.1% | < 0.5% | < 5% (discovery mode) |
| 5xx Errors | 0 | 0 | < 1% |
| Rate Limit Effectiveness | N/A | N/A | > 90% |
| Idempotency Compliance | N/A | N/A | 100% |

### Alert Thresholds

Set production monitoring alerts at:
- 80% of discovered VU capacity limits
- p95 > 300ms (early warning before 400ms SLA breach)
- Error rate > 0.05% (early warning before 0.1% SLA breach)

## Troubleshooting

### Common Issues

**JWT Token Expired:**
```bash
# Regenerate token
npm run load:setup
# Or manually via OTP flow
```

**Database Connection Errors:**
```bash
# Check API health
curl http://localhost:8000/internal/ready

# Restart stack if needed
npm run docker:down && npm run docker:up
```

**Rate Limiting During Tests:**
```bash
# Use proper test tokens (higher limits)
export WORKER_JWT=$(npm run load:setup --silent | grep "worker_jwt")

# Or temporarily increase rate limits for testing
```

### Performance Issues

**Tests Running Slow:**
- Ensure k6 has sufficient resources (8GB+ RAM recommended for stress tests)
- Use dedicated test environment, not shared development setup
- Check network latency to target API

**Inconsistent Results:**
- Run tests multiple times and average results
- Ensure consistent system state between test runs
- Check for background processes affecting performance

## CI/CD Integration

### GitHub Actions

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly Sunday 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/scenario_1_baseline.js
        env:
          BASE_URL: ${{ secrets.STAGING_API_URL }}
          WORKER_JWT: ${{ secrets.LOAD_TEST_JWT }}
```

### Performance Regression Detection

Integrate with performance monitoring to detect regressions:

```bash
# Compare current results with baseline
python scripts/compare_load_test_results.py \
  tests/load/results/scenario_1_baseline_current.json \
  tests/load/results/scenario_1_baseline_baseline.json
```

## Contributing

### Adding New Test Scenarios

1. Create new test file: `tests/load/scenario_5_custom.js`
2. Follow existing patterns for metrics and error handling
3. Add npm script to `package.json`
4. Update this README with scenario documentation
5. Add thresholds appropriate to scenario goals

### Custom Metrics

```javascript
import { Counter, Rate, Trend } from 'k6/metrics';

const customMetric = new Counter('custom_requests_total');
const customRate = new Rate('custom_success_rate');
const customTrend = new Trend('custom_response_time', true);

export default function () {
  // Your test logic
  customMetric.add(1);
  customRate.add(response.status === 200);
  customTrend.add(response.timings.duration);
}
```

---

## Support

- **Documentation:** [k6 Official Docs](https://k6.io/docs/)
- **Suraksha API:** See `README.md` in project root
- **Performance Issues:** Check `PRD.md` Section 39 for requirements

**Load testing is critical for production readiness. Run these tests regularly to ensure your infrastructure can handle real-world traffic patterns!** 🚀