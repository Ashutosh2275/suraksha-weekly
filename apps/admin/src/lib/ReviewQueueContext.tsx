'use client';

import React, { createContext, useContext } from 'react';
import { useClaims } from './ClaimsContext';

interface ReviewQueueContextType {
  pendingCount: number;
  updatePendingCount: (count: number) => void;
}

const ReviewQueueContext = createContext<ReviewQueueContextType | undefined>(undefined);

export function ReviewQueueProvider({ children }: { children: React.ReactNode }) {
  const { getPendingCount } = useClaims();
  
  const pendingCount = getPendingCount();
  
  // This is now a no-op since Claims Context manages the real count
  const updatePendingCount = (count: number) => {
    // Claims context automatically updates count
  };

  return (
    <ReviewQueueContext.Provider value={{ pendingCount, updatePendingCount }}>
      {children}
    </ReviewQueueContext.Provider>
  );
}

export function useReviewQueue() {
  const context = useContext(ReviewQueueContext);
  if (context === undefined) {
    throw new Error('useReviewQueue must be used within a ReviewQueueProvider');
  }
  return context;
}