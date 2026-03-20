/**
 * k6 Load Test Environment Configuration
 *
 * Centralized configuration for different testing environments
 */

// Environment-specific settings
export const ENVIRONMENTS = {
  local: {
    BASE_URL: 'http://localhost:8000',
    MAX_VUS: 500,
    ADMIN_TOKEN: 'admin-dev-token-12345',
    MOCK_MODE: true,
    RATE_LIMIT_BYPASS: true,
  },

  staging: {
    BASE_URL: 'https://staging-api.suraksha.com',
    MAX_VUS: 1000,
    ADMIN_TOKEN: '', // Set via environment variable
    MOCK_MODE: false,
    RATE_LIMIT_BYPASS: false,
  },

  production: {
    BASE_URL: 'https://api.suraksha.com',
    MAX_VUS: 2000,
    ADMIN_TOKEN: '', // Set via environment variable
    MOCK_MODE: false,
    RATE_LIMIT_BYPASS: false,
  },
};

// Test scenario configurations
export const SCENARIOS = {
  baseline: {
    name: 'Baseline Normal Load',
    stages: [
      { duration: '5m', target: 500 },
      { duration: '15m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      'http_req_duration': ['p(95)<400'],
      'http_req_failed': ['rate<0.001'],
    },
  },

  peak: {
    name: 'Disruption Peak Load',
    stages: [
      { duration: '1m', target: 2000 },
      { duration: '10m', target: 2000 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      'http_req_duration': ['p(95)<800'],
      'http_req_failed': ['rate<0.005'],
      'http_req_failed{status:503}': ['count<1'],
    },
  },

  stress: {
    name: 'Stress Breakpoint Discovery',
    stages: [
      { duration: '2m', target: 100 },
      { duration: '3m', target: 300 },
      { duration: '3m', target: 600 },
      { duration: '4m', target: 1200 },
      { duration: '4m', target: 2500 },
      { duration: '4m', target: 5000 },
      { duration: '5m', target: 5000 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      // Lenient thresholds for discovery mode
      'http_req_duration': ['p(95)<2000'],
      'http_req_failed': ['rate<0.05'],
    },
  },

  fraud: {
    name: 'Fraud Abuse Simulation',
    vus: 100,
    duration: '2m',
    thresholds: {
      'http_req_failed{status:429}': ['count>180'],
      'idempotency_compliance': ['rate==1.0'],
      'rate_limit_effectiveness': ['rate>0.90'],
    },
  },
};

// Performance targets by environment
export const PERFORMANCE_TARGETS = {
  local: {
    p95_latency_ms: 400,
    error_rate_pct: 0.1,
    availability_pct: 99.5,
  },

  staging: {
    p95_latency_ms: 600,
    error_rate_pct: 0.5,
    availability_pct: 99.0,
  },

  production: {
    p95_latency_ms: 400,
    error_rate_pct: 0.1,
    availability_pct: 99.9,
  },
};

// Test data configurations
export const TEST_DATA = {
  worker_pools: {
    small: 10,
    medium: 100,
    large: 1000,
  },

  cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune'],
  plans: ['basic', 'standard', 'pro'],
  platforms: ['Zomato', 'Swiggy'],

  phone_numbers: {
    base: '+919999000000',
    test_range: 1000, // +919999000001 to +919999001000
  },
};

// Helper functions
export function getEnvironmentConfig(env = 'local') {
  const config = ENVIRONMENTS[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}. Valid options: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return config;
}

export function getScenarioConfig(scenario) {
  const config = SCENARIOS[scenario];
  if (!config) {
    throw new Error(`Unknown scenario: ${scenario}. Valid options: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  return config;
}

export function adjustForEnvironment(scenarioConfig, environmentConfig) {
  // Adjust VU counts based on environment capacity
  if (environmentConfig.MAX_VUS) {
    if (scenarioConfig.stages) {
      scenarioConfig.stages = scenarioConfig.stages.map(stage => ({
        ...stage,
        target: Math.min(stage.target, environmentConfig.MAX_VUS),
      }));
    } else if (scenarioConfig.vus) {
      scenarioConfig.vus = Math.min(scenarioConfig.vus, environmentConfig.MAX_VUS);
    }
  }

  return scenarioConfig;
}

export function generateTestWorkerID(index = 0) {
  return `load_test_worker_${String(index + 1).padStart(3, '0')}`;
}

export function generateTestPhone(index = 0) {
  const baseNumber = parseInt(TEST_DATA.phone_numbers.base.replace('+91', ''));
  return `+91${baseNumber + index + 1}`;
}

export default {
  ENVIRONMENTS,
  SCENARIOS,
  PERFORMANCE_TARGETS,
  TEST_DATA,
  getEnvironmentConfig,
  getScenarioConfig,
  adjustForEnvironment,
  generateTestWorkerID,
  generateTestPhone,
};