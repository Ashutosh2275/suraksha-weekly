export type RiskSegment = "low" | "medium" | "high";
export type UserRole = "worker" | "reviewer" | "risk-admin" | "platform-admin";

export interface Worker {
  id: string;
  phone: string;
  city: string;
  zone: string;
  zoneIds?: string[];
  accountAgeDays: number;
  activeHours14d: number;
  avgWeeklyEarnings?: number;
  payoutAccountVerified: boolean;
  locationConsistency: number;
  trustScore: number;
  profileUpdatedAt?: string;
}

export interface Policy {
  id: string;
  workerId: string;
  city: string;
  zone: string;
  zoneIds?: string[];
  plan: "basic" | "standard" | "pro";
  premium: number;
  weeklyCoverageCap: number;
  coverageLimit?: number;
  startsAt: string;
  endsAt: string;
  waitingPeriodHours: number;
  waitingPeriodEndsAt?: string;
  status: "active" | "lapsed" | "cancelled";
  renewalOfPolicyId?: string;
  cancelledAt?: string;
  lapsedAt?: string;
  lastReminderAt?: string;
  coverageTermsVersion?: string;
}

export interface Claim {
  id: string;
  workerId: string;
  policyId: string;
  triggerEventId: string;
  triggerType: string;
  status: "initiated" | "in_review" | "approved" | "rejected" | "paid";
  riskScore: number;
  payoutAmount: number;
  decisionReasons: string[];
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  paidAt?: string;
}

export interface ClaimEvent {
  id: string;
  claimId: string;
  workerId: string;
  status: Claim["status"];
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PayoutTransaction {
  id: string;
  claimId: string;
  workerId: string;
  idempotencyKey: string;
  amount: number;
  status: "pending" | "success" | "failed";
  adapter: "mock" | "real";
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface LedgerEntry {
  id: string;
  claimId: string;
  workerId: string;
  payoutId: string;
  amount: number;
  idempotencyKey: string;
  status: "pending" | "settled" | "failed";
  createdAt: string;
  settledAt?: string;
}

export interface TriggerEvent {
  id: string;
  type: string;
  normalizedType?: string;
  source?: "weather" | "aqi" | "platform" | "manual" | "synthetic";
  zone: string;
  confidence: number;
  severityFactor?: number;
  eventStart?: string;
  eventEnd?: string;
  isConfirmed?: boolean;
  sourceData?: Record<string, unknown>;
  adapter?: "weather-mock" | "aqi-mock" | "fallback";
  degradedMode?: boolean;
  observedAt?: string;
  snapshot?: {
    rainMm?: number;
    aqi?: number;
    outageScore?: number;
    sourceConfidence?: number;
    notes?: string[];
  };
  createdAt: string;
}

export interface SessionRecord {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  subject: string;
  expiresAt: number;
  refreshExpiresAt: number;
  createdAt: string;
}

export interface RiskProfile {
  workerId: string;
  phone: string;
  fullName: string;
  dob: string;
  gender: "female" | "male" | "other";
  emergencyContact: string;
  aadhaar4: string;
  pan4: string;
  riderId: string;
  platformType: string;
  vehicleType: string;
  city: string;
  zone: string;
  serviceZones: string[];
  ordersPerDay: number;
  averageDailyOnlineHours: number;
  activeHoursWeek: number;
  activeHours14d: number;
  weeklyIncome4w: number;
  averageWeeklyEarnings: number;
  volatilityBand: "low" | "medium" | "high";
  payoutCycle: "weekly" | "biweekly";
  cashShare: number;
  digitalShare: number;
  nominee: string;
  upiId: string;
  bank4: string;
  accountAgeDays: number;
  locationConsistency: number;
  trustScore: number;
  payoutAccountVerified: boolean;
  kycVerified: boolean;
  consentAccepted: boolean;
  triggerDisclosureAccepted: boolean;
  updatedAt: string;
}

export interface PolicyReminder {
  id: string;
  policyId: string;
  workerId: string;
  dueAt: string;
  channel: "push" | "sms";
  status: "scheduled" | "sent";
  sentAt?: string;
}

export interface RetentionEvent {
  id: string;
  workerId: string;
  policyId: string;
  event: "purchase" | "renewal" | "cancel" | "lapse";
  createdAt: string;
}

export interface FraudContext {
  claimsLast24h: number;
  claimsLast7d: number;
  linkedIdentityMatches: number;
  triggerClaimCount: number;
}

export interface ReviewDecision {
  id: string;
  claimId: string;
  reviewerId: string;
  action: "approve" | "reject" | "hold";
  note?: string;
  secondaryHold: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  workerId: string;
  issueType: "quote" | "claim" | "payout" | "policy" | "other";
  priority: "low" | "medium" | "high";
  details: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  updatedAt?: string;
  assigneeId?: string;
  resolutionNote?: string;
}
