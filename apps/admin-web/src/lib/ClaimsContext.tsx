'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Unified Claim Interface
export interface UnifiedClaim {
  id: string;
  claimId: string;
  workerId: string;
  workerName: string;
  workerInitials: string;
  amount: number;
  zone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INVESTIGATING' | 'PAID' | 'CANCELLED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  submittedDate: Date;
  processingDays: number;
  fraudScore: number;
  incidentType: string;
  description: string;
  platform?: 'Swiggy' | 'Zomato' | 'Other';
  triggerType?: 'rain' | 'heat' | 'aqi';
  slaDeadline?: Date;
  payoutAmount?: number;
  mlScore?: number;
  // Review Queue specific fields
  triggeredRules?: Array<{
    id: string;
    icon: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  evidence?: {
    policyValid: boolean;
    zoneOverlap: boolean;
    waitingPeriodMet: boolean;
    gpsConsistent: boolean;
    deviceHistory: Array<{
      device: string;
      timestamp: Date;
    }>;
  };
  // Decision tracking
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewerNotes?: string;
  decisionHistory?: Array<{
    action: 'APPROVE' | 'REJECT' | 'INVESTIGATE';
    timestamp: Date;
    reviewer: string;
    notes: string;
  }>;
}

interface ClaimsContextType {
  claims: UnifiedClaim[];
  updateClaim: (claimId: string, updates: Partial<UnifiedClaim>) => void;
  addClaim: (claim: UnifiedClaim) => void;
  deleteClaim: (claimId: string) => void;
  approveClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => void;
  rejectClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => void;
  investigateClaim: (claimId: string, reviewerNotes: string, reviewer?: string) => void;
  getClaimsByStatus: (status: UnifiedClaim['status'] | 'ALL') => UnifiedClaim[];
  getReviewQueueClaims: () => UnifiedClaim[];
  getPendingCount: () => number;
  resetToMockData: () => void;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

// Convert Review Queue format to Unified format
const convertReviewQueueClaim = (reviewClaim: any): UnifiedClaim => ({
  id: reviewClaim.id,
  claimId: reviewClaim.id,
  workerId: reviewClaim.workerId,
  workerName: reviewClaim.workerName,
  workerInitials: reviewClaim.workerInitials,
  amount: reviewClaim.payoutAmount || 0,
  zone: reviewClaim.zone,
  status: reviewClaim.status === 'PENDING' ? 'PENDING' : 'INVESTIGATING',
  riskLevel: reviewClaim.riskTier,
  submittedDate: reviewClaim.timeSubmitted,
  processingDays: Math.max(0.1, (Date.now() - reviewClaim.timeSubmitted.getTime()) / (1000 * 60 * 60 * 24)),
  fraudScore: reviewClaim.fraudScore,
  incidentType: getIncidentType(reviewClaim.triggerType),
  description: getDescription(reviewClaim.triggerType, reviewClaim.zone),
  platform: reviewClaim.platform,
  triggerType: reviewClaim.triggerType,
  slaDeadline: reviewClaim.slaDeadline,
  payoutAmount: reviewClaim.payoutAmount,
  mlScore: reviewClaim.mlScore,
  triggeredRules: reviewClaim.triggeredRules,
  evidence: reviewClaim.evidence,
});

// Helper functions
function getIncidentType(triggerType: string): string {
  switch (triggerType) {
    case 'rain': return 'Weather - Rain Impact';
    case 'heat': return 'Weather - Heat Exposure';
    case 'aqi': return 'Environmental - Air Quality';
    default: return 'General Incident';
  }
}

function getDescription(triggerType: string, zone: string): string {
  switch (triggerType) {
    case 'rain': return `Rain-related delivery disruption in ${zone} affecting income`;
    case 'heat': return `Extreme heat exposure during work hours in ${zone}`;
    case 'aqi': return `Poor air quality conditions affecting work capacity in ${zone}`;
    default: return `Incident reported in ${zone}`;
  }
}

// Mock data for initial Claims (non-Review Queue claims)
const INITIAL_CLAIMS_DATA: UnifiedClaim[] = [
  {
    id: 'CLM-2024-5847',
    claimId: 'CLM-2024-5847',
    workerId: 'WRK-8374',
    workerName: 'Rajesh Kumar',
    workerInitials: 'RK',
    amount: 2500,
    zone: 'Andheri East',
    status: 'APPROVED',
    riskLevel: 'LOW',
    submittedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    processingDays: 0.5,
    fraudScore: 0.12,
    incidentType: 'Injury - Fall',
    description: 'Minor fall from ladder while cleaning building facade',
    platform: 'Swiggy',
    reviewedBy: 'Admin User',
    reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    reviewerNotes: 'Medical documentation verified. Legitimate claim.',
  },
  {
    id: 'CLM-2024-6234',
    claimId: 'CLM-2024-6234',
    workerId: 'WRK-3921',
    workerName: 'Sunita Devi',
    workerInitials: 'SD',
    amount: 1500,
    zone: 'Bandra West',
    status: 'PAID',
    riskLevel: 'MEDIUM',
    submittedDate: new Date(Date.now() - 18 * 60 * 60 * 1000),
    processingDays: 0.75,
    fraudScore: 0.23,
    incidentType: 'Equipment Damage',
    description: 'Phone damaged during delivery in heavy rain',
    platform: 'Zomato',
    reviewedBy: 'Admin User',
    reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    reviewerNotes: 'Equipment replacement approved. Payment processed.',
  },
  {
    id: 'CLM-2024-7102',
    claimId: 'CLM-2024-7102',
    workerId: 'WRK-5043',
    workerName: 'Mohammad Ali',
    workerInitials: 'MA',
    amount: 3200,
    zone: 'Koramangala',
    status: 'INVESTIGATING',
    riskLevel: 'HIGH',
    submittedDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
    processingDays: 0.33,
    fraudScore: 0.67,
    incidentType: 'Theft - Vehicle',
    description: 'Motorcycle stolen during delivery - police report filed',
    platform: 'Swiggy',
  },
];

// Mock Review Queue data (pending claims requiring manual review)
const INITIAL_REVIEW_QUEUE_DATA: UnifiedClaim[] = [
  {
    id: 'CLM-2024-001',
    claimId: 'CLM-2024-001',
    workerId: 'WRK-847',
    workerName: 'Arjun Singh',
    workerInitials: 'AS',
    amount: 420,
    zone: 'Andheri East',
    status: 'PENDING',
    riskLevel: 'CRITICAL',
    submittedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    processingDays: 0.08,
    fraudScore: 0.89,
    incidentType: 'Weather - Rain Impact',
    description: 'Rain-related delivery disruption in Andheri East affecting income',
    platform: 'Swiggy',
    triggerType: 'rain',
    slaDeadline: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes from now
    payoutAmount: 420,
    mlScore: 0.92,
    triggeredRules: [
      { id: 'R1', icon: '🚨', description: 'Impossible travel · 80km in 12 minutes', severity: 'high' },
      { id: 'R2', icon: '📱', description: 'New device registration during event', severity: 'medium' },
    ],
    evidence: {
      policyValid: true,
      zoneOverlap: false,
      waitingPeriodMet: true,
      gpsConsistent: false,
      deviceHistory: [
        { device: 'iPhone 13', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
        { device: 'OnePlus 9', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
    },
  },
  {
    id: 'CLM-2024-002',
    claimId: 'CLM-2024-002',
    workerId: 'WRK-1203',
    workerName: 'Priya Sharma',
    workerInitials: 'PS',
    amount: 315,
    zone: 'Gurgaon Sector 29',
    status: 'PENDING',
    riskLevel: 'HIGH',
    submittedDate: new Date(Date.now() - 45 * 60 * 1000),
    processingDays: 0.03,
    fraudScore: 0.34,
    incidentType: 'Weather - Heat Exposure',
    description: 'Extreme heat exposure during work hours in Gurgaon Sector 29',
    platform: 'Zomato',
    triggerType: 'heat',
    slaDeadline: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
    payoutAmount: 315,
    mlScore: 0.31,
    triggeredRules: [
      { id: 'R3', icon: '🌡️', description: 'Temperature threshold verification needed', severity: 'medium' },
    ],
    evidence: {
      policyValid: true,
      zoneOverlap: true,
      waitingPeriodMet: true,
      gpsConsistent: true,
      deviceHistory: [
        { device: 'Samsung S21', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ],
    },
  },
  {
    id: 'CLM-2024-003',
    claimId: 'CLM-2024-003',
    workerId: 'WRK-592',
    workerName: 'Amit Patel',
    workerInitials: 'AP',
    amount: 275,
    zone: 'Koramangala',
    status: 'PENDING',
    riskLevel: 'MEDIUM',
    submittedDate: new Date(Date.now() - 30 * 60 * 1000),
    processingDays: 0.02,
    fraudScore: 0.15,
    incidentType: 'Environmental - Air Quality',
    description: 'Poor air quality conditions affecting work capacity in Koramangala',
    platform: 'Swiggy',
    triggerType: 'aqi',
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    payoutAmount: 275,
    mlScore: 0.12,
    triggeredRules: [],
    evidence: {
      policyValid: true,
      zoneOverlap: true,
      waitingPeriodMet: true,
      gpsConsistent: true,
      deviceHistory: [
        { device: 'Xiaomi Redmi', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
    },
  },
];

export function ClaimsProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<UnifiedClaim[]>([]);

  // Load persisted claims from localStorage on mount
  useEffect(() => {
    const savedClaims = localStorage.getItem('allClaimsData');
    const savedReviewQueue = localStorage.getItem('reviewQueueClaims');
    
    let allClaims: UnifiedClaim[] = [];
    
    // Load existing claims
    if (savedClaims) {
      const parsedClaims = JSON.parse(savedClaims);
      allClaims = parsedClaims.map((claim: any) => ({
        ...claim,
        submittedDate: new Date(claim.submittedDate),
        slaDeadline: claim.slaDeadline ? new Date(claim.slaDeadline) : undefined,
        reviewedAt: claim.reviewedAt ? new Date(claim.reviewedAt) : undefined,
        evidence: claim.evidence ? {
          ...claim.evidence,
          deviceHistory: claim.evidence.deviceHistory?.map((device: any) => ({
            ...device,
            timestamp: new Date(device.timestamp)
          })) || []
        } : undefined,
      }));
    } else {
      allClaims = [...INITIAL_CLAIMS_DATA, ...INITIAL_REVIEW_QUEUE_DATA];
    }

    // Load Review Queue claims and convert them
    if (savedReviewQueue) {
      const reviewQueueClaims = JSON.parse(savedReviewQueue);
      const convertedReviewClaims = reviewQueueClaims.map((claim: any) => {
        // Convert dates
        const convertedClaim = {
          ...claim,
          slaDeadline: new Date(claim.slaDeadline),
          timeSubmitted: new Date(claim.timeSubmitted),
          evidence: {
            ...claim.evidence,
            deviceHistory: claim.evidence.deviceHistory.map((device: any) => ({
              ...device,
              timestamp: new Date(device.timestamp)
            }))
          }
        };
        return convertReviewQueueClaim(convertedClaim);
      });
      
      // Add review queue claims that don't exist in main claims
      convertedReviewClaims.forEach(reviewClaim => {
        const exists = allClaims.some(claim => claim.id === reviewClaim.id);
        if (!exists) {
          allClaims.push(reviewClaim);
        }
      });
    }

    setClaims(allClaims);
  }, []);

  // Persist claims to localStorage whenever claims change
  useEffect(() => {
    if (claims.length > 0) {
      localStorage.setItem('allClaimsData', JSON.stringify(claims));
    }
  }, [claims]);

  const updateClaim = (claimId: string, updates: Partial<UnifiedClaim>) => {
    setClaims(prev => prev.map(claim => 
      claim.id === claimId ? { ...claim, ...updates } : claim
    ));
  };

  const addClaim = (claim: UnifiedClaim) => {
    setClaims(prev => [claim, ...prev]);
  };

  const deleteClaim = (claimId: string) => {
    setClaims(prev => prev.filter(claim => claim.id !== claimId));
  };

  const approveClaim = (claimId: string, reviewerNotes: string, reviewer = 'Admin User') => {
    const now = new Date();
    updateClaim(claimId, {
      status: 'APPROVED',
      reviewedBy: reviewer,
      reviewedAt: now,
      reviewerNotes,
      decisionHistory: [
        ...(claims.find(c => c.id === claimId)?.decisionHistory || []),
        { action: 'APPROVE', timestamp: now, reviewer, notes: reviewerNotes }
      ]
    });
  };

  const rejectClaim = (claimId: string, reviewerNotes: string, reviewer = 'Admin User') => {
    const now = new Date();
    updateClaim(claimId, {
      status: 'REJECTED',
      reviewedBy: reviewer,
      reviewedAt: now,
      reviewerNotes,
      decisionHistory: [
        ...(claims.find(c => c.id === claimId)?.decisionHistory || []),
        { action: 'REJECT', timestamp: now, reviewer, notes: reviewerNotes }
      ]
    });
  };

  const investigateClaim = (claimId: string, reviewerNotes: string, reviewer = 'Admin User') => {
    const now = new Date();
    updateClaim(claimId, {
      status: 'INVESTIGATING',
      reviewedBy: reviewer,
      reviewedAt: now,
      reviewerNotes,
      decisionHistory: [
        ...(claims.find(c => c.id === claimId)?.decisionHistory || []),
        { action: 'INVESTIGATE', timestamp: now, reviewer, notes: reviewerNotes }
      ]
    });
  };

  const getClaimsByStatus = (status: UnifiedClaim['status'] | 'ALL'): UnifiedClaim[] => {
    if (status === 'ALL') return claims;
    return claims.filter(claim => claim.status === status);
  };

  const getReviewQueueClaims = (): UnifiedClaim[] => {
    return claims.filter(claim => claim.status === 'PENDING' && claim.slaDeadline);
  };

  const getPendingCount = (): number => {
    return getReviewQueueClaims().length;
  };

  const resetToMockData = () => {
    setClaims([...INITIAL_CLAIMS_DATA, ...INITIAL_REVIEW_QUEUE_DATA]);
    localStorage.setItem('allClaimsData', JSON.stringify([...INITIAL_CLAIMS_DATA, ...INITIAL_REVIEW_QUEUE_DATA]));
  };

  return (
    <ClaimsContext.Provider value={{
      claims,
      updateClaim,
      addClaim,
      deleteClaim,
      approveClaim,
      rejectClaim,
      investigateClaim,
      getClaimsByStatus,
      getReviewQueueClaims,
      getPendingCount,
      resetToMockData,
    }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  const context = useContext(ClaimsContext);
  if (context === undefined) {
    throw new Error('useClaims must be used within a ClaimsProvider');
  }
  return context;
}