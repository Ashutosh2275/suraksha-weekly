'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workerApi from './workerApi';

// Query keys for consistent cache management
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  policy: ['policy'] as const,
  claims: ['claims'] as const,
  payouts: ['payouts'] as const,
  alerts: ['alerts'] as const,
} as const;

// Dashboard data hook
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      // Fetch all dashboard data in parallel
      const [policy, alert] = await Promise.all([
        workerApi.getPolicySummary(),
        workerApi.getActiveAlert(),
      ]);
      
      return {
        policy,
        alert,
        lastSync: new Date(),
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for dashboard (more frequent updates)
  });
}

// Policy data hook
export function usePolicy() {
  return useQuery({
    queryKey: queryKeys.policy,
    queryFn: workerApi.getPolicySummary,
    staleTime: 10 * 60 * 1000, // 10 minutes for policy (changes infrequently)
  });
}

// Claims data hook
export function useClaims() {
  return useQuery({
    queryKey: queryKeys.claims,
    queryFn: workerApi.getClaims,
    staleTime: 5 * 60 * 1000, // 5 minutes for claims
  });
}

// Payouts data hook
export function usePayouts() {
  return useQuery({
    queryKey: queryKeys.payouts,
    queryFn: workerApi.getPayouts,
    staleTime: 5 * 60 * 1000, // 5 minutes for payouts
  });
}

// Active alert hook (for real-time updates)
export function useActiveAlert() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: workerApi.getActiveAlert,
    staleTime: 1 * 60 * 1000, // 1 minute for alerts (most time-sensitive)
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes for alerts
  });
}

// Mutation for submitting claims (optimistic updates)
export function useSubmitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimData: any) => {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, claimId: `CLM-${Date.now()}` };
    },
    onSuccess: () => {
      // Invalidate and refetch claims data after successful submission
      queryClient.invalidateQueries({ queryKey: queryKeys.claims });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error) => {
      console.error('Failed to submit claim:', error);
    },
  });
}

// Manual refresh function for pull-to-refresh functionality
export function useRefreshAll() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries();
  };
}

// Get cached data without triggering a fetch (for offline scenarios)
export function useCachedDashboard() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(queryKeys.dashboard);
}

export function useCachedPolicy() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(queryKeys.policy);
}

export function useCachedClaims() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(queryKeys.claims);
}

export function useCachedPayouts() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(queryKeys.payouts);
}

// Connection status hook
export function useConnectionStatus() {
  const queryClient = useQueryClient();
  
  return {
    isOnline: queryClient.getQueryCache().getAll().some(query => 
      query.state.fetchStatus === 'idle' && !query.state.error
    ),
  };
}