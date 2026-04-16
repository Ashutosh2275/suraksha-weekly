/**
 * API Client with Demo Mode Support
 * 
 * Automatically switches between mock data and real API based on NEXT_PUBLIC_DEMO_MODE
 */

import { mockFetch } from './mock-handlers';

export interface ApiClientOptions extends RequestInit {
  token?: string;
}

/**
 * Main API client function
 * - In demo mode: uses mockFetch with realistic data
 * - In production: calls real API with authentication
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Demo mode: use mock handlers
  if (isDemoMode) {
    console.log('[API CLIENT] Demo mode - using mock data');
    const response = await mockFetch(endpoint, options);
    const data = await response.json();
    
    if (!data.success && data.error) {
      throw new Error(data.error);
    }
    
    return data.data as T;
  }

  // Production mode: call real API
  const fullUrl = `${apiUrl}${endpoint}`;
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as HeadersInit),
  };

  // Add Bearer token if provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    // Try to get token from localStorage
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
  }

  console.log(`[API CLIENT] Calling ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data as T;
}

/**
 * Helper function to save auth token
 */
export function saveAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * Helper function to clear auth token
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

/**
 * Helper function to get current auth token
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// ==================== TYPED API FUNCTIONS ====================

export const api = {
  // Auth
  auth: {
    me: () => apiClient('/api/v1/auth/me'),
    requestOtp: (phone: string) => apiClient('/api/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
    verifyOtp: (phone: string, otp: string) => apiClient('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),
  },

  // Policies
  policies: {
    list: () => apiClient('/api/v1/policies/'),
    getQuote: (coverageAmount: number) => apiClient('/api/v1/policies/quote', {
      method: 'POST',
      body: JSON.stringify({ coverage_amount: coverageAmount }),
    }),
    purchase: (data: any) => apiClient('/api/v1/policies/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Claims
  claims: {
    list: () => apiClient('/api/v1/claims/'),
    getById: (id: string) => apiClient(`/api/v1/claims/${id}`),
    submit: (data: any) => apiClient('/api/v1/claims/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Payouts
  payouts: {
    list: () => apiClient('/api/v1/payouts/'),
  },

  // Dashboard
  dashboard: {
    summary: () => apiClient('/api/v1/dashboard/summary'),
  },

  // Triggers
  triggers: {
    active: () => apiClient('/api/v1/triggers/active'),
  },

  // Admin
  admin: {
    dashboard: () => apiClient('/api/v1/admin/dashboard'),
    reviewQueue: () => apiClient('/api/v1/admin/review-queue'),
    decideClaim: (claimId: string, decision: 'approve' | 'reject', notes?: string) =>
      apiClient(`/api/v1/admin/review-queue/${claimId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      }),
    triggers: () => apiClient('/api/v1/admin/triggers'),
    fraud: () => apiClient('/api/v1/admin/fraud'),
    auditLog: () => apiClient('/api/v1/admin/audit-log'),
    policies: () => apiClient('/api/v1/admin/policies'),
    claims: () => apiClient('/api/v1/admin/claims'),
  },
};
