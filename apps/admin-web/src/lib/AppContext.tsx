'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { UnifiedClaim } from './ClaimsContext';

// ================================================================================
// TYPES & INTERFACES
// ================================================================================

// Core App State
interface AppState {
  // Core entities
  claims: UnifiedClaim[];
  
  // Derived/computed state (cached for performance)
  reviewQueueClaims: UnifiedClaim[];
  pendingCounts: {
    total: number;
    reviewQueue: number;
    fraud: number;
    investigating: number;
  };
  
  // Dashboard metrics (calculated from real data)
  dashboardKPIs: {
    activePolicies: number;
    totalClaimsToday: number;
    totalAmountToday: number;
    approvalRate: number;
    avgProcessingTime: number;
    highRiskClaims: number;
  };
  
  // UI state
  selectedClaimId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // System state
  lastUpdated: Date;
  isOnline: boolean;
}

// Action types for reducer
type AppAction =
  | { type: 'SET_CLAIMS'; payload: UnifiedClaim[] }
  | { type: 'UPDATE_CLAIM'; payload: { claimId: string; updates: Partial<UnifiedClaim> } }
  | { type: 'ADD_CLAIM'; payload: UnifiedClaim }
  | { type: 'DELETE_CLAIM'; payload: string }
  | { type: 'SET_SELECTED_CLAIM'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'RECOMPUTE_DERIVED_STATE' }
  | { type: 'RESET_TO_MOCK_DATA' };

// Context interface
interface AppContextType {
  // State
  state: AppState;
  
  // Claim operations
  updateClaim: (claimId: string, updates: Partial<UnifiedClaim>) => void;
  addClaim: (claim: UnifiedClaim) => void;
  deleteClaim: (claimId: string) => void;
  
  // Decision operations (with real-time sync)
  approveClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => Promise<void>;
  rejectClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => Promise<void>;
  investigateClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => Promise<void>;
  
  // Query operations
  getClaimsByStatus: (status: UnifiedClaim['status'] | 'ALL') => UnifiedClaim[];
  getClaimById: (claimId: string) => UnifiedClaim | undefined;
  
  // UI operations
  setSelectedClaim: (claimId: string | null) => void;
  setError: (error: string | null) => void;
  
  // System operations
  syncFromServer: () => Promise<void>;
  resetToMockData: () => void;
}

// ================================================================================
// UTILITIES & HELPERS
// ================================================================================

// Date serialization helpers
const dateReplacer = (key: string, value: any) => {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  }
  return value;
};

const dateReviver = (key: string, value: any) => {
  if (value && typeof value === 'object' && value.__type === 'Date') {
    return new Date(value.value);
  }
  return value;
};

// Storage operations with proper date handling
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data, dateReplacer));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

const loadFromStorage = (key: string) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved, dateReviver) : null;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
};

// ================================================================================
// DERIVED STATE CALCULATIONS
// ================================================================================

const calculateDerivedState = (claims: UnifiedClaim[]) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Review Queue: Claims that need manual review (PENDING + INVESTIGATING with SLA)
  const reviewQueueClaims = claims.filter(claim => 
    (claim.status === 'PENDING' || claim.status === 'INVESTIGATING') && claim.slaDeadline
  );
  
  // Pending counts
  const pendingCounts = {
    total: claims.filter(c => c.status === 'PENDING').length,
    reviewQueue: reviewQueueClaims.length,
    fraud: claims.filter(c => c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH').length,
    investigating: claims.filter(c => c.status === 'INVESTIGATING').length,
  };
  
  // Dashboard KPIs (calculated from real data)
  const claimsToday = claims.filter(c => c.submittedDate >= todayStart);
  const approvedClaims = claims.filter(c => c.status === 'APPROVED');
  const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
  const todayAmount = claimsToday.reduce((sum, claim) => sum + claim.amount, 0);
  
  const dashboardKPIs = {
    activePolicies: 2847, // This would come from separate workers data
    totalClaimsToday: claimsToday.length,
    totalAmountToday: todayAmount,
    approvalRate: claims.length > 0 ? (approvedClaims.length / claims.length) * 100 : 0,
    avgProcessingTime: claims.length > 0 
      ? claims.reduce((sum, c) => sum + (c.processingDays || 0), 0) / claims.length 
      : 0,
    highRiskClaims: pendingCounts.fraud,
  };
  
  return {
    reviewQueueClaims,
    pendingCounts,
    dashboardKPIs,
  };
};

// ================================================================================
// REDUCER
// ================================================================================

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CLAIMS': {
      const claims = action.payload;
      const derived = calculateDerivedState(claims);
      const newState = {
        ...state,
        claims,
        ...derived,
        lastUpdated: new Date(),
        error: null,
      };
      
      // Persist to localStorage (debounced)
      saveToStorage('suraksha_claims_data', claims);
      
      return newState;
    }
    
    case 'UPDATE_CLAIM': {
      const { claimId, updates } = action.payload;
      const claims = state.claims.map(claim =>
        claim.id === claimId ? { ...claim, ...updates } : claim
      );
      
      const derived = calculateDerivedState(claims);
      const newState = {
        ...state,
        claims,
        ...derived,
        lastUpdated: new Date(),
      };
      
      saveToStorage('suraksha_claims_data', claims);
      return newState;
    }
    
    case 'ADD_CLAIM': {
      const claims = [...state.claims, action.payload];
      const derived = calculateDerivedState(claims);
      const newState = {
        ...state,
        claims,
        ...derived,
        lastUpdated: new Date(),
      };
      
      saveToStorage('suraksha_claims_data', claims);
      return newState;
    }
    
    case 'DELETE_CLAIM': {
      const claims = state.claims.filter(claim => claim.id !== action.payload);
      const derived = calculateDerivedState(claims);
      const newState = {
        ...state,
        claims,
        ...derived,
        selectedClaimId: state.selectedClaimId === action.payload ? null : state.selectedClaimId,
        lastUpdated: new Date(),
      };
      
      saveToStorage('suraksha_claims_data', claims);
      return newState;
    }
    
    case 'SET_SELECTED_CLAIM':
      return { ...state, selectedClaimId: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    
    case 'RECOMPUTE_DERIVED_STATE': {
      const derived = calculateDerivedState(state.claims);
      return { ...state, ...derived };
    }
    
    case 'RESET_TO_MOCK_DATA': {
      // Import the original mock data
      const mockClaims = getMockClaimsData();
      const derived = calculateDerivedState(mockClaims);
      const newState = {
        ...state,
        claims: mockClaims,
        ...derived,
        lastUpdated: new Date(),
        error: null,
      };
      
      saveToStorage('suraksha_claims_data', mockClaims);
      return newState;
    }
    
    default:
      return state;
  }
};

// ================================================================================
// MOCK DATA (imported from original ClaimsContext)
// ================================================================================

const getMockClaimsData = (): UnifiedClaim[] => [
  {
    id: 'CLM-2024-5847',
    claimId: 'CLM-2024-5847',
    workerId: 'WRK-8374',
    workerName: 'Rajesh Kumar',
    workerInitials: 'RK',
    amount: 15000,
    zone: 'Indiranagar',
    status: 'APPROVED',
    riskLevel: 'LOW',
    submittedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    processingDays: 2.5,
    fraudScore: 0.15,
    incidentType: 'Weather - Rain Impact',
    description: 'Rain-related delivery disruption in Indiranagar affecting income',
    platform: 'Swiggy',
    triggerType: 'rain',
    payoutAmount: 15000,
  },
  {
    id: 'CLM-2024-5848',
    claimId: 'CLM-2024-5848', 
    workerId: 'WRK-7293',
    workerName: 'Priya Sharma',
    workerInitials: 'PS',
    amount: 8500,
    zone: 'Whitefield',
    status: 'PENDING',
    riskLevel: 'MEDIUM',
    submittedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    processingDays: 1.2,
    fraudScore: 0.45,
    incidentType: 'Weather - Heat Exposure', 
    description: 'Extreme heat exposure during work hours in Whitefield',
    platform: 'Zomato',
    triggerType: 'heat',
    payoutAmount: 8500,
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    triggeredRules: [
      {
        id: 'RULE_1',
        icon: '⚠️',
        description: 'Multiple claims from same zone',
        severity: 'medium' as const,
      },
    ],
  },
  {
    id: 'CLM-2024-5849',
    claimId: 'CLM-2024-5849',
    workerId: 'WRK-9156', 
    workerName: 'Amit Singh',
    workerInitials: 'AS',
    amount: 22000,
    zone: 'Koramangala',
    status: 'INVESTIGATING',
    riskLevel: 'HIGH',
    submittedDate: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    processingDays: 0.25,
    fraudScore: 0.78,
    incidentType: 'Environmental - Air Quality',
    description: 'Poor air quality conditions affecting work capacity in Koramangala',
    platform: 'Swiggy', 
    triggerType: 'aqi',
    payoutAmount: 22000,
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
    triggeredRules: [
      {
        id: 'RULE_2',
        icon: '🚩',
        description: 'High fraud score detected',
        severity: 'high' as const,
      },
      {
        id: 'RULE_3',
        icon: '⏰',
        description: 'Claim submitted outside normal hours',
        severity: 'medium' as const,
      },
    ],
  },
];

// ================================================================================
// INITIAL STATE
// ================================================================================

const createInitialState = (): AppState => {
  // Try to load from localStorage first
  const savedClaims = loadFromStorage('suraksha_claims_data');
  const claims = savedClaims || getMockClaimsData();
  
  const derived = calculateDerivedState(claims);
  
  return {
    claims,
    ...derived,
    selectedClaimId: null,
    isLoading: false,
    error: null,
    lastUpdated: new Date(),
    isOnline: navigator.onLine,
  };
};

// ================================================================================
// CONTEXT & PROVIDER
// ================================================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  
  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // ================================================================================
  // MEMOIZED OPERATIONS
  // ================================================================================
  
  const updateClaim = useCallback((claimId: string, updates: Partial<UnifiedClaim>) => {
    dispatch({ type: 'UPDATE_CLAIM', payload: { claimId, updates } });
  }, []);
  
  const addClaim = useCallback((claim: UnifiedClaim) => {
    dispatch({ type: 'ADD_CLAIM', payload: claim });
  }, []);
  
  const deleteClaim = useCallback((claimId: string) => {
    dispatch({ type: 'DELETE_CLAIM', payload: claimId });
  }, []);
  
  const setSelectedClaim = useCallback((claimId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CLAIM', payload: claimId });
  }, []);
  
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  // Decision operations with optimistic updates and error handling
  const approveClaim = useCallback(async (claimId: string, reviewerNotes: string, reviewer = 'Admin') => {
    // Optimistic update
    const updates: Partial<UnifiedClaim> = {
      status: 'APPROVED',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      reviewerNotes,
      decisionHistory: [
        ...(state.claims.find(c => c.id === claimId)?.decisionHistory || []),
        {
          action: 'APPROVE' as const,
          timestamp: new Date(),
          reviewer,
          notes: reviewerNotes,
        },
      ],
    };
    
    dispatch({ type: 'UPDATE_CLAIM', payload: { claimId, updates } });
    
    try {
      // Here you would call the API
      // await adminApi.approveClaim(claimId, reviewerNotes);
      
      // If API call fails, you could revert the optimistic update
    } catch (error) {
      console.error('Failed to approve claim:', error);
      setError('Failed to approve claim. Please try again.');
      // Revert optimistic update if needed
    }
  }, [state.claims]);
  
  const rejectClaim = useCallback(async (claimId: string, reviewerNotes: string, reviewer = 'Admin') => {
    const updates: Partial<UnifiedClaim> = {
      status: 'REJECTED',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      reviewerNotes,
      decisionHistory: [
        ...(state.claims.find(c => c.id === claimId)?.decisionHistory || []),
        {
          action: 'REJECT' as const,
          timestamp: new Date(),
          reviewer,
          notes: reviewerNotes,
        },
      ],
    };
    
    dispatch({ type: 'UPDATE_CLAIM', payload: { claimId, updates } });
    
    try {
      // await adminApi.rejectClaim(claimId, reviewerNotes);
    } catch (error) {
      console.error('Failed to reject claim:', error);
      setError('Failed to reject claim. Please try again.');
    }
  }, [state.claims]);
  
  const investigateClaim = useCallback(async (claimId: string, reviewerNotes: string, reviewer = 'Admin') => {
    const updates: Partial<UnifiedClaim> = {
      status: 'INVESTIGATING',
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      reviewerNotes,
      decisionHistory: [
        ...(state.claims.find(c => c.id === claimId)?.decisionHistory || []),
        {
          action: 'INVESTIGATE' as const,
          timestamp: new Date(),
          reviewer,
          notes: reviewerNotes,
        },
      ],
    };
    
    dispatch({ type: 'UPDATE_CLAIM', payload: { claimId, updates } });
    
    try {
      // await adminApi.investigateClaim(claimId, reviewerNotes);
    } catch (error) {
      console.error('Failed to investigate claim:', error);
      setError('Failed to start investigation. Please try again.');
    }
  }, [state.claims]);
  
  // Query operations (memoized for performance)
  const getClaimsByStatus = useCallback((status: UnifiedClaim['status'] | 'ALL') => {
    if (status === 'ALL') return state.claims;
    return state.claims.filter(claim => claim.status === status);
  }, [state.claims]);
  
  const getClaimById = useCallback((claimId: string) => {
    return state.claims.find(claim => claim.id === claimId);
  }, [state.claims]);
  
  // System operations
  const syncFromServer = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Here you would fetch from the server
      // const freshData = await adminApi.getAllClaims();
      // dispatch({ type: 'SET_CLAIMS', payload: freshData });
      
      // For now, just recompute derived state
      dispatch({ type: 'RECOMPUTE_DERIVED_STATE' });
    } catch (error) {
      console.error('Failed to sync from server:', error);
      setError('Failed to sync data. Please check your connection.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  const resetToMockData = useCallback(() => {
    dispatch({ type: 'RESET_TO_MOCK_DATA' });
  }, []);
  
  // Context value (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo((): AppContextType => ({
    state,
    updateClaim,
    addClaim,
    deleteClaim,
    approveClaim,
    rejectClaim,
    investigateClaim,
    getClaimsByStatus,
    getClaimById,
    setSelectedClaim,
    setError,
    syncFromServer,
    resetToMockData,
  }), [
    state,
    updateClaim,
    addClaim,
    deleteClaim,
    approveClaim,
    rejectClaim,
    investigateClaim,
    getClaimsByStatus,
    getClaimById,
    setSelectedClaim,
    setError,
    syncFromServer,
    resetToMockData,
  ]);
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// ================================================================================
// HOOKS
// ================================================================================

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Legacy compatibility hooks (to ease migration)
export const useClaims = () => {
  const { state, ...actions } = useApp();
  return {
    claims: state.claims,
    getPendingCount: () => state.pendingCounts.total,
    getReviewQueueClaims: () => state.reviewQueueClaims,
    ...actions,
  };
};

export const useReviewQueue = () => {
  const { state } = useApp();
  return {
    pendingCount: state.pendingCounts.reviewQueue,
    reviewQueueClaims: state.reviewQueueClaims,
  };
};

// Specialized hooks for different screens
export const useDashboardKPIs = () => {
  const { state } = useApp();
  return {
    kpis: state.dashboardKPIs,
    isLoading: state.isLoading,
    lastUpdated: state.lastUpdated,
  };
};

export const useClaimDetails = (claimId: string | null) => {
  const { getClaimById, setSelectedClaim } = useApp();
  return {
    claim: claimId ? getClaimById(claimId) : null,
    setSelectedClaim,
  };
};

export default AppContext;