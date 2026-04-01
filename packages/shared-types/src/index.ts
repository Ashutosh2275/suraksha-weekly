// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  correlation_id?: string;
}

export interface ApiErrorResponse {
  success: false;
  error_code: string;
  message: string;
  correlation_id: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// User and Auth Types
export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: 'worker' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Policy Types
export interface Policy {
  id: string;
  worker_id: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  premium_amount: number;
  coverage_amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyCreate {
  worker_id: string;
  premium_amount: number;
  coverage_amount: number;
  duration_days: number;
}

// Claim Types
export interface Claim {
  id: string;
  policy_id: string;
  worker_id: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  claim_amount: number;
  approved_amount?: number;
  reason: string;
  submitted_at: string;
  reviewed_at?: string;
  paid_at?: string;
}

export interface ClaimCreate {
  policy_id: string;
  claim_amount: number;
  reason: string;
  supporting_documents?: string[];
}

// Fraud Types
export interface FraudScore {
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: FraudFactor[];
  recommendation: string;
}

export interface FraudFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface FraudCheckRequest {
  worker_id: string;
  claim_id?: string;
  policy_id?: string;
  metadata?: Record<string, any>;
}

// Trigger Data Types
export interface TriggerEvent {
  id: string;
  event_type: 'weather' | 'traffic' | 'disruption' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: GeoLocation;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
}

// Worker Activity Types
export interface WorkerActivity {
  worker_id: string;
  date: string;
  total_deliveries: number;
  total_earnings: number;
  hours_worked: number;
  disruption_events: number;
}

// Dashboard/Analytics Types
export interface DashboardStats {
  total_policies: number;
  active_policies: number;
  total_claims: number;
  pending_claims: number;
  total_payout: number;
  fraud_alerts: number;
}

export interface WorkerStats {
  worker_id: string;
  total_policies: number;
  active_policies: number;
  total_claims: number;
  total_received: number;
  last_activity: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Filter Types
export interface ClaimFilters extends PaginationParams {
  status?: Claim['status'];
  worker_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PolicyFilters extends PaginationParams {
  status?: Policy['status'];
  worker_id?: string;
}
