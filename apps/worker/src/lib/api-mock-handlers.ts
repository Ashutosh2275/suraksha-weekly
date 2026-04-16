/**
 * Mock API Handlers for Demo Mode
 * 
 * Realistic Indian delivery partner data for Suraksha Weekly demo
 */

// ==================== MOCK DATA ====================

export const MOCK_WORKERS = [
  {
    id: 'W001',
    name: 'Ravi Mehta',
    phone: '+91 98765 43210',
    email: 'ravi.mehta@example.com',
    city: 'Mumbai',
    platform: 'Swiggy',
    avg_hours_per_day: 6,
    weekly_earnings: 4200,
    trust_score: 82,
    trust_tier: 'GOLD',
    kyc_verified: true,
    active_since: '2024-06-15',
  },
  {
    id: 'W002',
    name: 'Priya Sharma',
    phone: '+91 98123 45678',
    email: 'priya.sharma@example.com',
    city: 'Bengaluru',
    platform: 'Zomato',
    avg_hours_per_day: 8,
    weekly_earnings: 5800,
    trust_score: 91,
    trust_tier: 'PLATINUM',
    kyc_verified: true,
    active_since: '2024-03-10',
  },
  {
    id: 'W003',
    name: 'Arjun Patel',
    phone: '+91 99887 76543',
    email: 'arjun.patel@example.com',
    city: 'Delhi',
    platform: 'Swiggy',
    avg_hours_per_day: 5,
    weekly_earnings: 3500,
    trust_score: 68,
    trust_tier: 'SILVER',
    kyc_verified: true,
    active_since: '2025-01-20',
  },
];

export const MOCK_POLICIES = [
  {
    id: 'POL-001',
    worker_id: 'W001',
    worker_name: 'Ravi Mehta',
    premium: 67,
    coverage_amount: 1500,
    status: 'ACTIVE',
    start_date: '2026-04-01',
    end_date: '2026-04-07',
    zones: ['Andheri East', 'Bandra', 'Powai'],
    auto_renew: true,
    created_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'POL-002',
    worker_id: 'W002',
    worker_name: 'Priya Sharma',
    premium: 89,
    coverage_amount: 2000,
    status: 'ACTIVE',
    start_date: '2026-04-01',
    end_date: '2026-04-07',
    zones: ['Koramangala', 'Indiranagar', 'Whitefield'],
    auto_renew: true,
    created_at: '2026-04-01T10:30:00Z',
  },
  {
    id: 'POL-003',
    worker_id: 'W003',
    worker_name: 'Arjun Patel',
    premium: 49,
    coverage_amount: 1200,
    status: 'LAPSED',
    start_date: '2026-03-25',
    end_date: '2026-03-31',
    zones: ['Connaught Place', 'Karol Bagh'],
    auto_renew: false,
    created_at: '2026-03-25T11:00:00Z',
  },
];

export const MOCK_TRIGGERS = [
  {
    id: 'TRG-001',
    type: 'HEAVY_RAIN',
    location: 'Andheri East, Mumbai',
    city: 'Mumbai',
    zone: 'Andheri East',
    confidence: 0.94,
    severity: 1.2,
    started_at: '2026-04-05T14:30:00Z',
    ended_at: null,
    status: 'ACTIVE',
    affected_workers: 147,
    claims_submitted: 12,
    metadata: {
      rainfall_mm: 85,
      duration_hours: 3,
      source: 'IMD Weather API',
    },
  },
  {
    id: 'TRG-002',
    type: 'SEVERE_POLLUTION',
    location: 'Connaught Place, Delhi',
    city: 'Delhi',
    zone: 'Connaught Place',
    confidence: 0.87,
    severity: 1.1,
    started_at: '2026-04-06T06:00:00Z',
    ended_at: '2026-04-06T12:00:00Z',
    status: 'RESOLVED',
    affected_workers: 89,
    claims_submitted: 5,
    metadata: {
      aqi: 385,
      pm25: 280,
      source: 'OpenAQ API',
    },
  },
];

export const MOCK_CLAIMS = [
  {
    id: 'CLM-001',
    worker_id: 'W001',
    worker_name: 'Ravi Mehta',
    policy_id: 'POL-001',
    trigger_id: 'TRG-001',
    trigger_type: 'HEAVY_RAIN',
    location: 'Andheri East, Mumbai',
    amount: 420,
    status: 'PAID',
    fraud_score: 0.12,
    fraud_risk: 'LOW',
    submitted_at: '2026-04-05T15:00:00Z',
    reviewed_at: '2026-04-05T15:30:00Z',
    approved_at: '2026-04-05T15:30:00Z',
    paid_at: '2026-04-05T16:00:00Z',
    reviewer: 'System Auto-Approval',
    notes: 'Auto-approved - Low fraud risk',
  },
  {
    id: 'CLM-002',
    worker_id: 'W001',
    worker_name: 'Ravi Mehta',
    policy_id: 'POL-001',
    trigger_id: 'TRG-002',
    trigger_type: 'SEVERE_POLLUTION',
    location: 'Bandra, Mumbai',
    amount: 300,
    status: 'IN_REVIEW',
    fraud_score: 0.45,
    fraud_risk: 'MEDIUM',
    submitted_at: '2026-04-06T13:00:00Z',
    reviewed_at: null,
    approved_at: null,
    paid_at: null,
    reviewer: null,
    notes: 'Pending manual review - Medium risk',
  },
  {
    id: 'CLM-003',
    worker_id: 'W002',
    worker_name: 'Priya Sharma',
    policy_id: 'POL-002',
    trigger_id: 'TRG-001',
    trigger_type: 'HEAVY_RAIN',
    location: 'Koramangala, Bengaluru',
    amount: 560,
    status: 'APPROVED',
    fraud_score: 0.08,
    fraud_risk: 'LOW',
    submitted_at: '2026-04-05T16:00:00Z',
    reviewed_at: '2026-04-05T16:15:00Z',
    approved_at: '2026-04-05T16:15:00Z',
    paid_at: null,
    reviewer: 'System Auto-Approval',
    notes: 'Approved - Payment processing',
  },
  {
    id: 'CLM-004',
    worker_id: 'W003',
    worker_name: 'Arjun Patel',
    policy_id: 'POL-003',
    trigger_id: 'TRG-002',
    trigger_type: 'SEVERE_POLLUTION',
    location: 'Connaught Place, Delhi',
    amount: 250,
    status: 'REJECTED',
    fraud_score: 0.22,
    fraud_risk: 'LOW',
    submitted_at: '2026-04-06T07:00:00Z',
    reviewed_at: '2026-04-06T07:30:00Z',
    approved_at: null,
    paid_at: null,
    reviewer: 'Admin Review',
    notes: 'Rejected - Policy lapsed, waiting period not met',
  },
];

export const MOCK_FRAUD_ASSESSMENTS = [
  {
    id: 'FRD-001',
    claim_id: 'CLM-001',
    worker_id: 'W001',
    score: 0.12,
    risk_level: 'LOW',
    decision: 'AUTO_APPROVE',
    factors: [
      { factor: 'Historical behavior', weight: 0.3, score: 0.95 },
      { factor: 'Location verification', weight: 0.3, score: 0.92 },
      { factor: 'Timing consistency', weight: 0.2, score: 0.88 },
      { factor: 'Pattern analysis', weight: 0.2, score: 0.90 },
    ],
    model_version: 'v2.1.0',
    assessed_at: '2026-04-05T15:05:00Z',
  },
  {
    id: 'FRD-002',
    claim_id: 'CLM-002',
    worker_id: 'W001',
    score: 0.45,
    risk_level: 'MEDIUM',
    decision: 'MANUAL_REVIEW',
    factors: [
      { factor: 'Multiple claims in 24h', weight: 0.3, score: 0.65 },
      { factor: 'Location verification', weight: 0.3, score: 0.80 },
      { factor: 'Timing pattern', weight: 0.2, score: 0.70 },
      { factor: 'Amount threshold', weight: 0.2, score: 0.75 },
    ],
    model_version: 'v2.1.0',
    assessed_at: '2026-04-06T13:05:00Z',
  },
  {
    id: 'FRD-003',
    claim_id: 'CLM-005',
    worker_id: 'W999',
    score: 0.89,
    risk_level: 'CRITICAL',
    decision: 'AUTO_BLOCK',
    factors: [
      { factor: 'Impossible travel detected', weight: 0.4, score: 0.05 },
      { factor: 'Beneficiary reuse pattern', weight: 0.3, score: 0.10 },
      { factor: 'Device fingerprint mismatch', weight: 0.2, score: 0.15 },
      { factor: 'Velocity check failed', weight: 0.1, score: 0.20 },
    ],
    model_version: 'v2.1.0',
    assessed_at: '2026-04-06T10:00:00Z',
  },
];

export const MOCK_PAYOUTS = [
  {
    id: 'PAY-001',
    claim_id: 'CLM-001',
    worker_id: 'W001',
    worker_name: 'Ravi Mehta',
    amount: 420,
    status: 'SUCCESS',
    method: 'UPI',
    upi_id: 'ravi.mehta@paytm',
    transaction_id: 'TXN-20260405160012',
    utr_number: 'UTR123456789012',
    initiated_at: '2026-04-05T16:00:00Z',
    completed_at: '2026-04-05T16:00:12Z',
    failure_reason: null,
  },
  {
    id: 'PAY-002',
    claim_id: 'CLM-003',
    worker_id: 'W002',
    worker_name: 'Priya Sharma',
    amount: 560,
    status: 'SUCCESS',
    method: 'UPI',
    upi_id: 'priya.sharma@oksbi',
    transaction_id: 'TXN-20260405162030',
    utr_number: 'UTR987654321098',
    initiated_at: '2026-04-05T16:20:00Z',
    completed_at: '2026-04-05T16:20:30Z',
    failure_reason: null,
  },
  {
    id: 'PAY-003',
    claim_id: 'CLM-002',
    worker_id: 'W001',
    worker_name: 'Ravi Mehta',
    amount: 300,
    status: 'PENDING',
    method: 'UPI',
    upi_id: 'ravi.mehta@paytm',
    transaction_id: null,
    utr_number: null,
    initiated_at: null,
    completed_at: null,
    failure_reason: null,
  },
];

export const MOCK_AUDIT_LOG = [
  {
    id: 'AUD-001',
    action: 'CLAIM_APPROVED',
    entity_type: 'CLAIM',
    entity_id: 'CLM-001',
    user: 'system@suraksha.com',
    user_role: 'SYSTEM',
    details: 'Auto-approved claim CLM-001 for worker W001 (Ravi Mehta)',
    ip_address: '192.168.1.100',
    timestamp: '2026-04-05T15:30:00Z',
  },
  {
    id: 'AUD-002',
    action: 'CLAIM_SUBMITTED',
    entity_type: 'CLAIM',
    entity_id: 'CLM-002',
    user: 'W001',
    user_role: 'WORKER',
    details: 'Worker submitted claim for SEVERE_POLLUTION trigger',
    ip_address: '103.123.45.67',
    timestamp: '2026-04-06T13:00:00Z',
  },
  {
    id: 'AUD-003',
    action: 'CLAIM_REJECTED',
    entity_type: 'CLAIM',
    entity_id: 'CLM-004',
    user: 'admin@suraksha.com',
    user_role: 'ADMIN',
    details: 'Rejected claim CLM-004 - Policy lapsed',
    ip_address: '192.168.1.50',
    timestamp: '2026-04-06T07:30:00Z',
  },
];

// ==================== MOCK API HANDLERS ====================

export interface MockResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export async function mockFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  const url = new URL(endpoint, 'http://localhost:8000');
  const path = url.pathname;

  console.log(`[MOCK API] ${method} ${path}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let responseData: MockResponse = { success: true };

  // ==================== AUTH ENDPOINTS ====================
  if (path === '/api/v1/auth/me') {
    responseData = {
      success: true,
      data: {
        ...MOCK_WORKERS[0],
        token: 'mock-jwt-token-123',
      },
    };
  }

  else if (path === '/api/v1/auth/otp/request') {
    responseData = {
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: '+91 98765 43210',
        expires_in: 300,
      },
    };
  }

  else if (path === '/api/v1/auth/otp/verify') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    if (body.otp === '123456') {
      responseData = {
        success: true,
        data: {
          ...MOCK_WORKERS[0],
          token: 'mock-jwt-token-123',
        },
      };
    } else {
      responseData = {
        success: false,
        error: 'Invalid OTP',
      };
    }
  }

  // ==================== POLICY ENDPOINTS ====================
  else if (path === '/api/v1/policies' || path === '/api/v1/policies/') {
    responseData = {
      success: true,
      data: MOCK_POLICIES.filter(p => p.worker_id === 'W001'),
    };
  }

  else if (path === '/api/v1/policies/quote') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    responseData = {
      success: true,
      data: {
        premium: body.coverage_amount ? Math.round(body.coverage_amount * 0.045) : 67,
        coverage_amount: body.coverage_amount || 1500,
        valid_until: new Date(Date.now() + 300000).toISOString(),
      },
    };
  }

  else if (path === '/api/v1/policies/purchase') {
    responseData = {
      success: true,
      data: {
        ...MOCK_POLICIES[0],
        id: `POL-${Date.now()}`,
        created_at: new Date().toISOString(),
      },
    };
  }

  // ==================== CLAIM ENDPOINTS ====================
  else if (path === '/api/v1/claims' || path === '/api/v1/claims/') {
    responseData = {
      success: true,
      data: MOCK_CLAIMS.filter(c => c.worker_id === 'W001'),
    };
  }

  else if (path.startsWith('/api/v1/claims/')) {
    const claimId = path.split('/').pop();
    const claim = MOCK_CLAIMS.find(c => c.id === claimId);
    responseData = {
      success: true,
      data: claim || null,
    };
  }

  // ==================== PAYOUT ENDPOINTS ====================
  else if (path === '/api/v1/payouts' || path === '/api/v1/payouts/') {
    responseData = {
      success: true,
      data: MOCK_PAYOUTS.filter(p => p.worker_id === 'W001'),
    };
  }

  // ==================== DASHBOARD ENDPOINTS ====================
  else if (path === '/api/v1/dashboard/summary') {
    responseData = {
      success: true,
      data: {
        active_policy: MOCK_POLICIES[0],
        stats: {
          protected_this_week: 1500,
          hours_covered: 42,
          claims_this_season: 2,
          claims_approved: 1,
          trust_score: 82,
          total_payouts: 420,
        },
        recent_claims: MOCK_CLAIMS.filter(c => c.worker_id === 'W001').slice(0, 3),
        active_triggers: MOCK_TRIGGERS.filter(t => t.status === 'ACTIVE'),
        recent_payouts: MOCK_PAYOUTS.filter(p => p.worker_id === 'W001').slice(0, 2),
      },
    };
  }

  // ==================== TRIGGER ENDPOINTS ====================
  else if (path === '/api/v1/triggers/active') {
    responseData = {
      success: true,
      data: MOCK_TRIGGERS.filter(t => t.status === 'ACTIVE'),
    };
  }

  // ==================== ADMIN ENDPOINTS ====================
  else if (path === '/api/v1/admin/dashboard') {
    responseData = {
      success: true,
      data: {
        stats: {
          total_workers: 1247,
          active_policies: 892,
          pending_claims: 23,
          fraud_alerts: 5,
          total_payouts_today: 12450,
          approval_rate: 94.2,
        },
        recent_activity: MOCK_AUDIT_LOG.slice(0, 10),
      },
    };
  }

  else if (path === '/api/v1/admin/review-queue') {
    responseData = {
      success: true,
      data: MOCK_CLAIMS.filter(c => c.status === 'IN_REVIEW'),
    };
  }

  else if (path.match(/\/api\/v1\/admin\/review-queue\/.*\/decide/)) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    responseData = {
      success: true,
      data: {
        claim_id: path.split('/')[5],
        decision: body.decision,
        updated_at: new Date().toISOString(),
      },
    };
  }

  else if (path === '/api/v1/admin/triggers') {
    responseData = {
      success: true,
      data: MOCK_TRIGGERS,
    };
  }

  else if (path === '/api/v1/admin/fraud') {
    responseData = {
      success: true,
      data: {
        metrics: {
          total_assessments: 1247,
          auto_approved: 1089,
          manual_review: 143,
          auto_blocked: 15,
          average_score: 0.23,
        },
        recent_alerts: MOCK_FRAUD_ASSESSMENTS.filter(f => f.risk_level !== 'LOW'),
      },
    };
  }

  else if (path === '/api/v1/admin/audit-log') {
    responseData = {
      success: true,
      data: MOCK_AUDIT_LOG,
    };
  }

  else if (path === '/api/v1/admin/policies') {
    responseData = {
      success: true,
      data: MOCK_POLICIES,
    };
  }

  else if (path === '/api/v1/admin/claims') {
    responseData = {
      success: true,
      data: MOCK_CLAIMS,
    };
  }

  // ==================== 404 HANDLER ====================
  else {
    responseData = {
      success: false,
      error: `Mock endpoint not implemented: ${path}`,
    };
  }

  // Return mock Response object
  return new Response(JSON.stringify(responseData), {
    status: responseData.success ? 200 : 400,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
