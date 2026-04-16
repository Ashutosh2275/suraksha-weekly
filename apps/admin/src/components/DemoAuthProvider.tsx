'use client';

import React, { useEffect, useState } from 'react';

interface DemoSession {
  userId: string;
  role: 'RISK_ADMIN';
  name: string;
  email: string;
  loginTime: string;
}

interface DemoAuthProviderProps {
  children: React.ReactNode;
}

export function DemoAuthProvider({ children }: DemoAuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Auto-login as RISK_ADMIN on first load
      const existingSession = localStorage.getItem('demo_admin_session');
      
      if (!existingSession) {
        const demoSession: DemoSession = {
          userId: 'admin-001',
          role: 'RISK_ADMIN',
          name: 'Demo Admin',
          email: 'admin@suraksha-weekly.com',
          loginTime: new Date().toISOString(),
        };
        
        localStorage.setItem('demo_admin_session', JSON.stringify(demoSession));
        console.log('[DEMO AUTH] Auto-login as RISK_ADMIN');
      }
      
      setIsInitialized(true);
    }
  }, []);

  if (!isInitialized) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <DemoBanner />
      {children}
    </>
  );
}

function DemoBanner() {
  return (
    <div className="bg-amber-400 text-amber-900 text-center py-2 px-4 font-medium text-sm shadow-sm z-50 relative">
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">⚡</span>
        <span>Demo Mode — Guidewire DEVTrails 2026</span>
      </div>
    </div>
  );
}

// Helper function to get demo session (for use in API calls)
export function getDemoSession(): DemoSession | null {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem('demo_admin_session');
    return session ? JSON.parse(session) : null;
  }
  return null;
}

// Helper function to check if user is authenticated in demo mode
export function isDemoAuthenticated(): boolean {
  return getDemoSession() !== null;
}

export default DemoAuthProvider;