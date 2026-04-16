/**
 * Mock Data Provider for Worker App
 * Used when NEXT_PUBLIC_DEMO_MODE=true
 */

export const mockWorkerData = {
  worker: {
    id: 'W12345',
    name: 'Ravi Kumar',
    phone: '+91 98765 43210',
    email: 'ravi.kumar@example.com',
    city: 'Mumbai',
    trust_score: 80,
    trust_tier: 'GOLD',
    kyc_verified: true,
    active_since: '2025-01-15',
  },

  activePolicy: {
    id: 'POL-2026-001',
    worker_id: 'W12345',
    status: 'ACTIVE',
    coverage_amount: 1500,
    premium_paid: 75,
    start_date: '2026-04-01',
    end_date: '2026-04-07',
    zones: ['Andheri East', 'Bandra', 'Powai'],
    auto_renew: true,
  },

  stats: {
    protected_this_week: 1500,
    hours_covered: 42,
    claims_this_season: 2,
    claims_approved: 2,
    trust_score: 80,
    total_payouts: 840,
  },

  recentClaims: [
    {
      id: 'CLM-001',
      trigger_type: 'HEAVY_RAIN',
      location: 'Andheri East',
      amount: 420,
      status: 'APPROVED',
      submitted_at: '2026-04-02T14:30:00Z',
      approved_at: '2026-04-02T15:00:00Z',
      payout_status: 'COMPLETED',
    },
    {
      id: 'CLM-002',
      trigger_type: 'EXTREME_HEAT',
      location: 'Bandra',
      amount: 300,
      status: 'APPROVED',
      submitted_at: '2026-03-28T11:00:00Z',
      approved_at: '2026-03-28T11:30:00Z',
      payout_status: 'COMPLETED',
    },
  ],

  activeTriggers: [
    {
      id: 'TRG-001',
      type: 'HEAVY_RAIN',
      location: 'Andheri East',
      severity: 'HIGH',
      started_at: '2026-04-06T14:00:00Z',
      message: 'Heavy rain detected in your coverage zone',
      eligible_for_claim: true,
    },
  ],

  recentPayouts: [
    {
      id: 'PAY-001',
      claim_id: 'CLM-001',
      amount: 420,
      status: 'COMPLETED',
      method: 'UPI',
      processed_at: '2026-04-02T16:00:00Z',
      utr_number: 'UTR123456789',
    },
    {
      id: 'PAY-002',
      claim_id: 'CLM-002',
      amount: 300,
      status: 'COMPLETED',
      method: 'UPI',
      processed_at: '2026-03-28T12:00:00Z',
      utr_number: 'UTR987654321',
    },
  ],

  notifications: [
    {
      id: 'NOT-001',
      type: 'TRIGGER_ALERT',
      title: 'Heavy Rain Alert',
      message: 'Heavy rain detected in Andheri East. You may be eligible for a payout.',
      read: false,
      created_at: '2026-04-06T14:00:00Z',
    },
    {
      id: 'NOT-002',
      type: 'CLAIM_APPROVED',
      title: 'Claim Approved',
      message: 'Your claim CLM-001 has been approved. Payout initiated.',
      read: true,
      created_at: '2026-04-02T15:00:00Z',
    },
  ],
};

export default mockWorkerData;
