'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DemoModeIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if we're in demo/mock mode
    const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';

    setIsDemoMode(mockMode || isDevelopment);
    setIsVisible(mockMode || isDevelopment);
  }, []);

  if (!isDemoMode) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="h-5 w-5" />
              </motion.div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  DEMO MODE
                </Badge>
                <span className="text-sm font-medium">
                  You&apos;re in demonstration mode
                </span>
              </div>

              <div className="hidden sm:block text-xs text-white/80">
                • Payments are mocked • No real charges • Test environment
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-white hover:bg-white/10 p-1"
              aria-label="Dismiss demo mode indicator"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Animated progress bar to show "demo activity" */}
          <motion.div
            className="h-0.5 bg-white/30"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for specific pages
export function DemoModeBadge() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    setIsDemoMode(mockMode || isDevelopment);
  }, []);

  if (!isDemoMode) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="fixed bottom-4 left-4 z-40"
    >
      <Badge variant="destructive" className="shadow-lg animate-pulse">
        <AlertTriangle className="h-3 w-3 mr-1" />
        DEMO MODE
      </Badge>
    </motion.div>
  );
}