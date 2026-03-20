/**
 * k6 Load Test Setup — Shared Infrastructure (PRD §39.3)
 *
 * Prepares test environment with realistic data before load testing
 * Generates JWT tokens and seeds database with test policies/triggers
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'admin-dev-token-12345';
const SETUP_TIMEOUT = '60s';

// ── Setup Functions ───────────────────────────────────────────────────────

export function generateWorkerJWT() {
  console.log('🔑 Generating worker JWT token...');

  // Use OTP auth flow to get valid JWT
  const otpResponse = http.post(
    `${BASE_URL}/api/v1/auth/request-otp`,
    JSON.stringify({
      phone: '+919999000001',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: SETUP_TIMEOUT,
    }
  );

  if (!check(otpResponse, { 'OTP request successful': (r) => r.status === 200 })) {
    throw new Error(`Failed to request OTP: ${otpResponse.status}`);
  }

  // For testing, use mock OTP verification
  const verifyResponse = http.post(
    `${BASE_URL}/api/v1/auth/verify-otp`,
    JSON.stringify({
      phone: '+919999000001',
      otp: '123456', // Mock OTP for testing
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: SETUP_TIMEOUT,
    }
  );

  if (!check(verifyResponse, { 'OTP verification successful': (r) => r.status === 200 })) {
    console.warn('OTP verification failed, using fallback token generation...');

    // Fallback: generate token via admin endpoint
    const tokenResponse = http.post(
      `${BASE_URL}/api/v1/admin/testing/generate-token`,
      JSON.stringify({
        worker_id: 'load_test_worker_primary',
        phone: '+919999000001',
        name: 'Load Test Worker',
        city: 'Mumbai',
        platform_type: 'Zomato',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN,
        },
        timeout: SETUP_TIMEOUT,
      }
    );

    if (check(tokenResponse, { 'Token generation successful': (r) => r.status === 200 })) {
      const tokenData = JSON.parse(tokenResponse.body);
      return tokenData.data.access_token;
    } else {
      throw new Error('Failed to generate worker JWT token');
    }
  }

  const verifyData = JSON.parse(verifyResponse.body);
  return verifyData.data.access_token;
}

export function seedTestDatabase() {
  console.log('🌱 Seeding test database with realistic data...');

  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Token': ADMIN_TOKEN,
  };

  // 1. Create bulk test policies
  console.log('📋 Creating 10,000 active test policies...');

  const bulkSeedResponse = http.post(
    `${BASE_URL}/api/v1/admin/demo/bulk-seed`,
    JSON.stringify({
      worker_count: 1000,
      policy_count: 10000,
      trigger_count: 500,
      claim_count: 200,
      fraud_cluster_count: 5,
    }),
    { headers, timeout: SETUP_TIMEOUT }
  );

  if (!check(bulkSeedResponse, { 'Bulk seed successful': (r) => r.status === 200 })) {
    console.error(`Bulk seed failed: ${bulkSeedResponse.status} - ${bulkSeedResponse.body}`);
    throw new Error('Failed to seed test database');
  }

  const seedData = JSON.parse(bulkSeedResponse.body);
  console.log(`✅ Seeded ${seedData.data.policies_created} policies, ${seedData.data.triggers_created} triggers`);

  // 2. Create specific test workers for different scenarios
  const testWorkers = [
    {
      worker_id: 'load_test_worker_001',
      name: 'Load Test Worker 01',
      phone: '+919999000101',
      city: 'Mumbai',
      platform_type: 'Zomato',
      avg_daily_hours: 8.5,
      avg_weekly_earnings: 5500,
    },
    {
      worker_id: 'load_test_worker_002',
      name: 'Load Test Worker 02',
      phone: '+919999000102',
      city: 'Delhi',
      platform_type: 'Swiggy',
      avg_daily_hours: 7.0,
      avg_weekly_earnings: 4800,
    },
    {
      worker_id: 'fraud_target_worker_001',
      name: 'Fraud Target Worker',
      phone: '+919999000999',
      city: 'Bengaluru',
      platform_type: 'Zomato',
      avg_daily_hours: 6.0,
      avg_weekly_earnings: 4000,
    },
  ];

  for (const worker of testWorkers) {
    const workerResponse = http.post(
      `${BASE_URL}/api/v1/admin/demo/create-worker`,
      JSON.stringify(worker),
      { headers, timeout: SETUP_TIMEOUT }
    );

    check(workerResponse, {
      [`Worker ${worker.worker_id} created`]: (r) => r.status === 200 || r.status === 409,
    });
  }

  // 3. Create pre-existing trigger events for testing
  console.log('🌧️ Creating active trigger events...');

  const triggerEvents = [
    {
      type: 'HeavyRain',
      zone: 'Mumbai_Western',
      value: 85.0,
      threshold: 75.0,
      confidence_score: 0.92,
      sources: ['weather_api', 'imd_radar'],
      audit_snapshot: { source: 'load_test_setup' },
    },
    {
      type: 'SeverePollution',
      zone: 'Delhi_Central',
      value: 320.0,
      threshold: 300.0,
      confidence_score: 0.88,
      sources: ['aqi_api', 'cpcb_monitor'],
      audit_snapshot: { source: 'load_test_setup' },
    },
    {
      type: 'ExtremeHeat',
      zone: 'Hyderabad_Central',
      value: 47.0,
      threshold: 45.0,
      confidence_score: 0.95,
      sources: ['weather_api', 'local_station'],
      audit_snapshot: { source: 'load_test_setup' },
    },
  ];

  for (const trigger of triggerEvents) {
    const triggerResponse = http.post(
      `${BASE_URL}/api/v1/admin/demo/create-trigger`,
      JSON.stringify(trigger),
      { headers, timeout: SETUP_TIMEOUT }
    );

    check(triggerResponse, {
      [`Trigger ${trigger.type} created`]: (r) => r.status === 200 || r.status === 409,
    });
  }

  console.log('✅ Test database seeding completed');

  return {
    workers_created: testWorkers.length,
    triggers_created: triggerEvents.length,
    bulk_policies: seedData.data.policies_created || 0,
    bulk_triggers: seedData.data.triggers_created || 0,
  };
}

export function validateSystemReadiness() {
  console.log('🔍 Validating system readiness for load testing...');

  const checks = [
    {
      name: 'API Health',
      url: `${BASE_URL}/internal/ready`,
      expect: 200,
    },
    {
      name: 'Database Connectivity',
      url: `${BASE_URL}/internal/startup`,
      expect: 200,
    },
    {
      name: 'Redis Cache',
      url: `${BASE_URL}/api/v1/triggers/active`,
      expect: [200, 401], // 401 is OK without auth
    },
  ];

  for (const healthCheck of checks) {
    const response = http.get(healthCheck.url, { timeout: '10s' });

    const isExpected = Array.isArray(healthCheck.expect)
      ? healthCheck.expect.includes(response.status)
      : response.status === healthCheck.expect;

    if (!isExpected) {
      throw new Error(
        `${healthCheck.name} failed: expected ${healthCheck.expect}, got ${response.status}`
      );
    }

    console.log(`✅ ${healthCheck.name} check passed`);
  }

  console.log('🚀 System ready for load testing');
}

export function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  const cleanupResponse = http.delete(
    `${BASE_URL}/api/v1/admin/demo/cleanup`,
    null,
    {
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      timeout: SETUP_TIMEOUT,
    }
  );

  if (check(cleanupResponse, { 'Cleanup successful': (r) => r.status === 200 })) {
    console.log('✅ Test data cleanup completed');
  } else {
    console.warn('⚠️  Test data cleanup failed - manual cleanup may be required');
  }
}

// ── Main Setup Function ───────────────────────────────────────────────────

export function setup() {
  console.log('🏗️  Starting k6 Load Test Setup...');
  console.log(`🎯 Target API: ${BASE_URL}`);

  try {
    // 1. Validate system health
    validateSystemReadiness();

    // 2. Generate authentication tokens
    const workerJWT = generateWorkerJWT();
    console.log('✅ Worker JWT generated successfully');

    // 3. Seed test database
    const seedResults = seedTestDatabase();

    // 4. Final readiness check
    sleep(2); // Allow seeded data to propagate
    validateSystemReadiness();

    console.log('🎉 Load test setup completed successfully!');

    return {
      tokens: {
        worker_jwt: workerJWT,
        admin_token: ADMIN_TOKEN,
      },
      seed_results: seedResults,
      setup_timestamp: new Date().toISOString(),
      base_url: BASE_URL,
    };

  } catch (error) {
    console.error(`❌ Setup failed: ${error.message}`);
    throw error;
  }
}

// ── Teardown Function ─────────────────────────────────────────────────────

export function teardown(data) {
  console.log('🏁 Load test teardown starting...');

  try {
    // Uncomment to clean up test data after tests
    // cleanupTestData();

    console.log('📊 Load test session completed');
    console.log(`⏰ Setup was performed at: ${data.setup_timestamp}`);
    console.log(`📋 Created ${data.seed_results.workers_created} test workers`);
    console.log(`🌧️  Created ${data.seed_results.triggers_created} trigger events`);
    console.log(`📄 Created ${data.seed_results.bulk_policies} bulk policies`);

  } catch (error) {
    console.error(`⚠️  Teardown issues: ${error.message}`);
    console.log('Manual cleanup may be required');
  }
}

// ── Utility Functions ─────────────────────────────────────────────────────

export function getLoadTestJWT() {
  // This function can be called from other test scripts
  // if they need to generate their own JWT tokens
  return generateWorkerJWT();
}

export function createTestWorker(workerData) {
  // Utility function to create individual test workers
  // during test execution if needed
  const response = http.post(
    `${BASE_URL}/api/v1/admin/demo/create-worker`,
    JSON.stringify(workerData),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': ADMIN_TOKEN,
      },
      timeout: SETUP_TIMEOUT,
    }
  );

  return response.status === 200 || response.status === 409;
}

// ── Export for use in other test scripts ──────────────────────────────────

export {
  BASE_URL,
  ADMIN_TOKEN,
  SETUP_TIMEOUT,
};