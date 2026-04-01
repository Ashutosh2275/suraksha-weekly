const { PrismaClient } = require("./generated/client");

const prisma = new PrismaClient();

const ids = {
  worker1: "11111111-1111-1111-1111-111111111111",
  worker2: "22222222-2222-2222-2222-222222222222",
  worker3: "33333333-3333-3333-3333-333333333333",
  risk1: "44444444-4444-4444-4444-444444444441",
  risk2: "44444444-4444-4444-4444-444444444442",
  risk3: "44444444-4444-4444-4444-444444444443",
  policy1: "55555555-5555-5555-5555-555555555551",
  policy2: "55555555-5555-5555-5555-555555555552",
  policy3: "55555555-5555-5555-5555-555555555553",
  policy4: "55555555-5555-5555-5555-555555555554",
  policy5: "55555555-5555-5555-5555-555555555555",
  trigger1: "66666666-6666-6666-6666-666666666666",
  claim1: "77777777-7777-7777-7777-777777777771",
  claim2: "77777777-7777-7777-7777-777777777772",
  claim3: "77777777-7777-7777-7777-777777777773",
  claim4: "77777777-7777-7777-7777-777777777774",
  claim5: "77777777-7777-7777-7777-777777777775",
  payout1: "88888888-8888-8888-8888-888888888888"
};

async function main() {
  await prisma.$transaction([
    prisma.payoutTransaction.deleteMany(),
    prisma.fraudAssessment.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.policy.deleteMany(),
    prisma.riskProfile.deleteMany(),
    prisma.triggerEvent.deleteMany(),
    prisma.worker.deleteMany()
  ]);

  await prisma.worker.createMany({
    data: [
      {
        id: ids.worker1,
        phone: "+919876543210",
        full_name: "Aman Verma",
        city: "Bengaluru",
        platform_type: "SWIGGY",
        avg_daily_hours: "9.5",
        avg_weekly_earnings: "12600.00",
        is_active: true
      },
      {
        id: ids.worker2,
        phone: "+919812345678",
        full_name: "Riya Shaikh",
        city: "Mumbai",
        platform_type: "ZOMATO",
        avg_daily_hours: "8.0",
        avg_weekly_earnings: "11250.00",
        is_active: true
      },
      {
        id: ids.worker3,
        phone: "+919900001234",
        full_name: "Karthik N",
        city: "Chennai",
        platform_type: "OTHER",
        avg_daily_hours: "7.0",
        avg_weekly_earnings: "9800.00",
        is_active: true
      }
    ]
  });

  await prisma.riskProfile.createMany({
    data: [
      {
        id: ids.risk1,
        worker_id: ids.worker1,
        location_risk_index: "0.640",
        disruption_frequency_score: "0.520",
        exposure_multiplier: "1.150",
        trust_adjustment: "1.10",
        last_computed_at: new Date("2026-03-31T10:00:00Z"),
        version: 1
      },
      {
        id: ids.risk2,
        worker_id: ids.worker2,
        location_risk_index: "0.580",
        disruption_frequency_score: "0.470",
        exposure_multiplier: "1.020",
        trust_adjustment: "0.95",
        last_computed_at: new Date("2026-03-31T10:05:00Z"),
        version: 1
      },
      {
        id: ids.risk3,
        worker_id: ids.worker3,
        location_risk_index: "0.710",
        disruption_frequency_score: "0.690",
        exposure_multiplier: "1.250",
        trust_adjustment: "1.20",
        last_computed_at: new Date("2026-03-31T10:10:00Z"),
        version: 1
      }
    ]
  });

  await prisma.policy.createMany({
    data: [
      {
        id: ids.policy1,
        worker_id: ids.worker1,
        status: "ACTIVE",
        coverage_start: new Date("2026-03-01T00:00:00Z"),
        coverage_end: new Date("2026-03-31T23:59:59Z"),
        premium_amount: "149.00",
        coverage_limit: "5000.00",
        zone_ids: ["BLR-NORTH", "BLR-CENTRAL"],
        waiting_period_ends_at: new Date("2026-03-03T00:00:00Z")
      },
      {
        id: ids.policy2,
        worker_id: ids.worker2,
        status: "ACTIVE",
        coverage_start: new Date("2026-03-05T00:00:00Z"),
        coverage_end: new Date("2026-04-04T23:59:59Z"),
        premium_amount: "139.00",
        coverage_limit: "4500.00",
        zone_ids: ["MUM-WEST"],
        waiting_period_ends_at: null
      },
      {
        id: ids.policy3,
        worker_id: ids.worker3,
        status: "LAPSED",
        coverage_start: new Date("2026-02-01T00:00:00Z"),
        coverage_end: new Date("2026-02-28T23:59:59Z"),
        premium_amount: "119.00",
        coverage_limit: "4000.00",
        zone_ids: ["CHE-SOUTH"],
        waiting_period_ends_at: null
      },
      {
        id: ids.policy4,
        worker_id: ids.worker1,
        status: "CANCELLED",
        coverage_start: new Date("2026-01-01T00:00:00Z"),
        coverage_end: new Date("2026-01-31T23:59:59Z"),
        premium_amount: "129.00",
        coverage_limit: "4200.00",
        zone_ids: ["BLR-EAST"],
        waiting_period_ends_at: null,
        cancelled_at: new Date("2026-01-10T12:00:00Z")
      },
      {
        id: ids.policy5,
        worker_id: ids.worker2,
        status: "EXPIRED",
        coverage_start: new Date("2025-12-01T00:00:00Z"),
        coverage_end: new Date("2025-12-31T23:59:59Z"),
        premium_amount: "109.00",
        coverage_limit: "3800.00",
        zone_ids: ["MUM-CENTRAL"],
        waiting_period_ends_at: null
      }
    ]
  });

  await prisma.triggerEvent.create({
    data: {
      id: ids.trigger1,
      trigger_type: "HEAVY_RAIN",
      zone_id: "BLR-NORTH",
      severity_factor: "1.320",
      confidence_score: "0.910",
      source_data: {
        source: "imd",
        bulletin_id: "IMD-2026-04-01-001",
        rainfall_mm: 122
      },
      event_start: new Date("2026-04-01T06:00:00Z"),
      event_end: new Date("2026-04-01T18:00:00Z"),
      is_confirmed: true
    }
  });

  await prisma.claim.createMany({
    data: [
      {
        id: ids.claim1,
        policy_id: ids.policy1,
        trigger_event_id: ids.trigger1,
        worker_id: ids.worker1,
        status: "INITIATED",
        payout_amount: null,
        rejection_reason: null,
        initiated_at: new Date("2026-04-01T07:00:00Z"),
        resolved_at: null,
        decision_trace: { stage: "claim_created" }
      },
      {
        id: ids.claim2,
        policy_id: ids.policy2,
        trigger_event_id: ids.trigger1,
        worker_id: ids.worker2,
        status: "IN_REVIEW",
        payout_amount: null,
        rejection_reason: null,
        initiated_at: new Date("2026-04-01T07:10:00Z"),
        resolved_at: null,
        decision_trace: { stage: "fraud_review_pending" }
      },
      {
        id: ids.claim3,
        policy_id: ids.policy3,
        trigger_event_id: ids.trigger1,
        worker_id: ids.worker3,
        status: "APPROVED",
        payout_amount: "740.00",
        rejection_reason: null,
        initiated_at: new Date("2026-04-01T07:20:00Z"),
        resolved_at: new Date("2026-04-01T10:00:00Z"),
        decision_trace: { stage: "approved", score: 0.08 }
      },
      {
        id: ids.claim4,
        policy_id: ids.policy4,
        trigger_event_id: ids.trigger1,
        worker_id: ids.worker1,
        status: "REJECTED",
        payout_amount: null,
        rejection_reason: "Outside active coverage window",
        initiated_at: new Date("2026-04-01T07:30:00Z"),
        resolved_at: new Date("2026-04-01T09:30:00Z"),
        decision_trace: { stage: "rejected", reason_code: "COVERAGE_WINDOW" }
      },
      {
        id: ids.claim5,
        policy_id: ids.policy5,
        trigger_event_id: ids.trigger1,
        worker_id: ids.worker2,
        status: "PAID",
        payout_amount: "510.00",
        rejection_reason: null,
        initiated_at: new Date("2026-04-01T07:40:00Z"),
        resolved_at: new Date("2026-04-01T11:00:00Z"),
        decision_trace: { stage: "paid", transaction: "payout-seeded-1" }
      }
    ]
  });

  await prisma.payoutTransaction.create({
    data: {
      id: ids.payout1,
      claim_id: ids.claim3,
      worker_id: ids.worker3,
      amount: "740.00",
      beneficiary_handle: "karthik@upi",
      gateway: "RAZORPAY",
      gateway_reference: "rzp_demo_0001",
      status: "SUCCESS",
      idempotency_key: "seed-payout-claim3-20260401",
      initiated_at: new Date("2026-04-01T10:05:00Z"),
      settled_at: new Date("2026-04-01T10:07:00Z"),
      reconciled: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
