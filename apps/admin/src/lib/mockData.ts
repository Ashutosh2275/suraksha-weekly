/**
 * Mock Data Provider for Admin Dashboard
 * Used when NEXT_PUBLIC_DEMO_MODE=true
 */

export const mockAdminData = {
  stats: {
    total_workers: 1247,
    active_policies: 892,
    pending_claims: 23,
    fraud_alerts: 5,
    total_payouts_today: 12450,
    approval_rate: 94.2,
  },

  recentClaims: [
    {
      id: 'CLM-001',
      worker_id: 'W12345',
      worker_name: 'Ravi Kumar',
      trigger_type: 'HEAVY_RAIN',
      location: 'Andheri East',
      amount: 420,
      status: 'APPROVED',
      fraud_score: 0.12,
      risk_level: 'LOW',
      submitted_at: '2026-04-06T14:30:00Z',
      reviewed_at: '2026-04-06T15:00:00Z',
      reviewer: 'Admin User',
    },
    {
      id: 'CLM-002',
      worker_id: 'W67890',
      worker_name: 'Priya Sharma',
      trigger_type: 'EXTREME_HEAT',
      location: 'Bandra',
      amount: 300,
      status: 'PENDING',
      fraud_score: 0.45,
      risk_level: 'MEDIUM',
      submitted_at: '2026-04-06T13:00:00Z',
      reviewed_at: null,
      reviewer: null,
    },
    {
      id: 'CLM-003',
      worker_id: 'W11111',
      worker_name: 'Amit Patel',
      trigger_type: 'SEVERE_POLLUTION',
      location: 'Powai',
      amount: 250,
      status: 'INVESTIGATING',
      fraud_score: 0.78,
      risk_level: 'HIGH',
      submitted_at: '2026-04-06T12:00:00Z',
      reviewed_at: '2026-04-06T12:30:00Z',
      reviewer: 'Fraud Team',
    },
  ],

  fraudAlerts: [
    {
      id: 'FRD-001',
      claim_id: 'CLM-003',
      worker_id: 'W11111',
      worker_name: 'Amit Patel',
      fraud_score: 0.78,
      risk_factors: [
        'Multiple claims in short period',
        'Location mismatch detected',
        'Unusual timing pattern',
      ],
      status: 'INVESTIGATING',
      created_at: '2026-04-06T12:00:00Z',
    },
    {
      id: 'FRD-002',
      claim_id: 'CLM-004',
      worker_id: 'W22222',
      worker_name: 'Suresh Reddy',
      fraud_score: 0.65,
      risk_factors: [
        'New worker with high claim',
        'Timing outside coverage hours',
      ],
      status: 'BLOCKED',
      created_at: '2026-04-06T11:00:00Z',
    },
  ],

  triggers: [
    {
      id: 'TRG-001',
      type: 'HEAVY_RAIN',
      location: 'Andheri East',
      zone: 'North',
      severity: 'HIGH',
      started_at: '2026-04-06T14:00:00Z',
      ended_at: null,
      affected_workers: 147,
      claims_submitted: 12,
    },
    {
      id: 'TRG-002',
      type: 'EXTREME_HEAT',
      location: 'Bandra',
      zone: 'South',
      severity: 'MEDIUM',
      started_at: '2026-04-06T11:00:00Z',
      ended_at: '2026-04-06T16:00:00Z',
      affected_workers: 89,
      claims_submitted: 8,
    },
  ],

  auditLogs: [
    {
      id: 'AUD-001',
      action: 'CLAIM_APPROVED',
      user: 'admin@suraksha.com',
      entity_type: 'CLAIM',
      entity_id: 'CLM-001',
      details: 'Approved claim CLM-001 for worker W12345',
      timestamp: '2026-04-06T15:00:00Z',
      ip_address: '192.168.1.1',
    },
    {
      id: 'AUD-002',
      action: 'FRAUD_INVESTIGATION',
      user: 'fraud@suraksha.com',
      entity_type: 'CLAIM',
      entity_id: 'CLM-003',
      details: 'Flagged claim CLM-003 for fraud investigation',
      timestamp: '2026-04-06T12:30:00Z',
      ip_address: '192.168.1.2',
    },
  ],

  reviewQueue: [
    {
      id: 'RQ-001',
      claim_id: 'CLM-002',
      worker_name: 'Priya Sharma',
      priority: 'MEDIUM',
      age_hours: 2,
      amount: 300,
      status: 'PENDING_REVIEW',
    },
    {
      id: 'RQ-002',
      claim_id: 'CLM-005',
      worker_name: 'Vikram Singh',
      priority: 'HIGH',
      age_hours: 1,
      amount: 500,
      status: 'PENDING_REVIEW',
    },
  ],

  healthChecks: {
    api: { status: 'healthy', latency_ms: 45 },
    fraud_service: { status: 'healthy', latency_ms: 120 },
    trigger_service: { status: 'healthy', latency_ms: 80 },
    database: { status: 'healthy', latency_ms: 12 },
    redis: { status: 'healthy', latency_ms: 3 },
  },
};

export default mockAdminData;
