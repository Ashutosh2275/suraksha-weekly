'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge } from '@/components/ui';

// Mock data - would come from API in production
const POLICY_DATA = {
  policyId: 'POL-2026-04-001-MUM',
  status: 'ACTIVE' as const,
  period: {
    start: '2026-04-01',
    end: '2026-04-07',
  },
  coverageLimit: 1500,
  premiumPaid: 67,
  zones: ['Andheri East', 'Bandra West', 'Central Mumbai'],
  triggers: [
    {
      id: 'rain',
      name: 'Heavy Rainfall',
      icon: 'rain',
      threshold: 'Heavy rainfall above 15mm/hour for 30+ minutes',
      status: 'active' as const,
    },
    {
      id: 'heat',
      name: 'Extreme Heat',
      icon: 'heat',
      threshold: 'Temperature above 42°C for 2+ hours during work period',
      status: 'active' as const,
    },
    {
      id: 'aqi',
      name: 'Poor Air Quality',
      icon: 'aqi',
      threshold: 'AQI above 300 (Hazardous) for 3+ hours',
      status: 'waiting' as const,
      waitingPeriod: 18, // hours
    },
  ],
  exclusions: [
    {
      title: 'Health issues',
      description:
        'This covers weather and environmental disruptions, not personal health conditions or injuries.',
    },
    {
      title: 'Vehicle repair or maintenance',
      description:
        'Scheduled maintenance or mechanical breakdowns are not covered events.',
    },
    {
      title: 'Planned events',
      description:
        'Pre-announced events like festivals, marathons, or elections are excluded.',
    },
    {
      title: 'Platform account issues',
      description:
        'Suspensions, deactivations, or disputes with Swiggy/Zomato are not covered.',
    },
  ],
  premiumFactors: [
    {
      icon: '🌧️',
      label: 'Mumbai Monsoon Zone',
      effect: 'higher' as const,
      amount: 12,
    },
    {
      icon: '🏍️',
      label: 'Clean claim history',
      effect: 'lower' as const,
      amount: -8,
    },
    {
      icon: '⏰',
      label: 'Standard work hours (8h/day)',
      effect: 'neutral' as const,
      amount: 0,
    },
  ],
  daysRemaining: 3,
  autoRenew: false,
};

// Animated SVG Icons
const RainIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Cloud */}
    <motion.path
      d="M36 20c0-6.627-5.373-12-12-12S12 13.373 12 20c0 .34.014.677.042 1.01C9.234 21.562 7 24.127 7 27.25 7 31.254 10.246 34.5 14.25 34.5h19.5c4.142 0 7.5-3.358 7.5-7.5 0-3.835-2.88-6.99-6.6-7.425A11.955 11.955 0 0036 20z"
      fill="#1B4FCC"
      fillOpacity="0.2"
      initial={{ y: -5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
    {/* Rain drops */}
    {[0, 1, 2].map((i) => (
      <motion.line
        key={i}
        x1={16 + i * 8}
        y1={36}
        x2={16 + i * 8}
        y2={42}
        stroke="#1B4FCC"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: [0, 2, 0], opacity: [1, 1, 1] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: i * 0.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </svg>
);

const HeatIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Thermometer body */}
    <motion.rect
      x="20"
      y="8"
      width="8"
      height="24"
      rx="4"
      fill="#F5A623"
      fillOpacity="0.2"
      stroke="#F5A623"
      strokeWidth="2"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.5 }}
      style={{ transformOrigin: 'center bottom' }}
    />
    {/* Thermometer bulb */}
    <motion.circle
      cx="24"
      cy="36"
      r="6"
      fill="#F5A623"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    />
    {/* Mercury rising animation */}
    <motion.rect
      x="22"
      y="12"
      width="4"
      height="20"
      rx="2"
      fill="#E53535"
      initial={{ height: 0, y: 32 }}
      animate={{ height: 20, y: 12 }}
      transition={{ duration: 1, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
    />
    {/* Heat waves */}
    {[0, 1].map((i) => (
      <motion.path
        key={i}
        d={`M${32 + i * 4} ${16 + i * 4} Q${34 + i * 4} ${14 + i * 4} ${
          36 + i * 4
        } ${16 + i * 4}`}
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: [0.5, 1, 0.5], x: [0, 3, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.3,
        }}
      />
    ))}
  </svg>
);

const AQIIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Pollution cloud shapes */}
    {[0, 1, 2].map((i) => (
      <motion.circle
        key={i}
        cx={18 + i * 6}
        cy={24 - i * 2}
        r={6 + i}
        fill="#A0AEC0"
        fillOpacity="0.3"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 0.5, delay: i * 0.15 }}
      />
    ))}
    {/* Floating particles */}
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.circle
        key={`particle-${i}`}
        cx={12 + i * 6}
        cy={28 + (i % 2) * 4}
        r="1.5"
        fill="#A0AEC0"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: [0, -8, 0], opacity: [0, 0.6, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: i * 0.4,
          ease: 'easeInOut',
        }}
      />
    ))}
  </svg>
);

const TriggerIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'rain':
      return <RainIcon />;
    case 'heat':
      return <HeatIcon />;
    case 'aqi':
      return <AQIIcon />;
    default:
      return null;
  }
};

export default function PolicyPage() {
  const [showExclusions, setShowExclusions] = useState(false);
  const [showPremiumBreakdown, setShowPremiumBreakdown] = useState(false);
  const [autoRenew, setAutoRenew] = useState(POLICY_DATA.autoRenew);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const daysProgress = ((7 - POLICY_DATA.daysRemaining) / 7) * 100;

  return (
    <div className="min-h-screen bg-surface-base pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-surface-card border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Policy Details
          </h1>
          <p className="text-text-secondary mt-1">Your coverage information</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Policy Certificate Card */}
        <Card variant="default" padding="lg" className="border-t-4 border-t-brand-primary">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-border-subtle">
            <div>
              {/* Suraksha Logo */}
              <div className="flex items-center gap-2 mb-2">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 3L4 9v7c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V9L16 3z"
                    fill="#1B4FCC"
                    fillOpacity="0.2"
                    stroke="#1B4FCC"
                    strokeWidth="2"
                  />
                  <path
                    d="M11 16l3 3 7-7"
                    stroke="#1B4FCC"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-display font-semibold text-text-primary text-lg">
                  Suraksha Weekly
                </span>
              </div>
              <p className="font-mono text-sm text-text-muted">
                {POLICY_DATA.policyId}
              </p>
            </div>
            <Badge variant="success" className="text-base px-4 py-2">
              {POLICY_DATA.status}
            </Badge>
          </div>

          {/* Two-column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-text-secondary mb-1">Policy Period</p>
              <p className="font-display font-semibold text-text-primary">
                {formatDate(POLICY_DATA.period.start)} –{' '}
                {formatDate(POLICY_DATA.period.end)}
              </p>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-1">Coverage Limit</p>
              <p className="font-display text-2xl font-bold text-brand-primary">
                Up to ₹{POLICY_DATA.coverageLimit.toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-1">Premium Paid</p>
              <p className="font-display font-semibold text-text-primary text-lg">
                ₹{POLICY_DATA.premiumPaid}
              </p>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-2">Zones Covered</p>
              <div className="flex flex-wrap gap-2">
                {POLICY_DATA.zones.map((zone, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-brand-primary-light text-brand-primary text-sm font-medium rounded-full"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Coverage Details Section */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">
            What's covered
          </h2>

          <div className="space-y-3">
            {POLICY_DATA.triggers.map((trigger) => (
              <Card key={trigger.id} variant="default" padding="lg">
                <div className="flex items-start gap-4">
                  {/* Animated Icon */}
                  <div className="flex-shrink-0">
                    <TriggerIcon type={trigger.icon} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-text-primary mb-2">
                      {trigger.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {trigger.threshold}
                    </p>

                    {/* Status */}
                    {trigger.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">
                        Waiting period: {trigger.waitingPeriod} hours remaining
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* What's NOT covered - Accordion */}
          <div className="mt-6">
            <button
              onClick={() => setShowExclusions(!showExclusions)}
              className="w-full flex items-center justify-between p-4 bg-surface-card border border-border rounded-lg hover:border-brand-primary transition-colors"
            >
              <span className="font-display font-semibold text-text-primary">
                What's NOT covered
              </span>
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                animate={{ rotate: showExclusions ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-text-muted"
              >
                <path
                  d="M5 7l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </button>

            <AnimatePresence>
              {showExclusions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    {POLICY_DATA.exclusions.map((exclusion, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-surface-subtle rounded-lg border-l-4 border-text-muted"
                      >
                        <h4 className="font-medium text-text-primary mb-1">
                          {exclusion.title}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          {exclusion.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Premium Breakdown Section */}
        <div>
          <button
            onClick={() => setShowPremiumBreakdown(!showPremiumBreakdown)}
            className="w-full flex items-center justify-between p-4 bg-surface-card border border-border rounded-lg hover:border-brand-primary transition-colors mb-3"
          >
            <span className="font-display text-lg font-semibold text-text-primary">
              Why ₹{POLICY_DATA.premiumPaid} this week?
            </span>
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              animate={{ rotate: showPremiumBreakdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-text-muted"
            >
              <path
                d="M5 7l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showPremiumBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Card variant="default" padding="lg">
                  <div className="space-y-4">
                    {/* Base premium */}
                    <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                      <span className="text-text-secondary">Base premium</span>
                      <span className="font-mono font-semibold text-text-primary">
                        ₹29
                      </span>
                    </div>

                    {/* Factors */}
                    {POLICY_DATA.premiumFactors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{factor.icon}</span>
                          <span className="text-sm text-text-secondary">
                            {factor.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Effect chip */}
                          {factor.effect === 'higher' && (
                            <span className="px-3 py-1 bg-brand-danger-light text-brand-danger text-xs font-semibold rounded-full flex items-center gap-1">
                              ↑ Higher
                            </span>
                          )}
                          {factor.effect === 'lower' && (
                            <span className="px-3 py-1 bg-brand-accent-light text-brand-accent text-xs font-semibold rounded-full flex items-center gap-1">
                              ↓ Lower
                            </span>
                          )}
                          {factor.effect === 'neutral' && (
                            <span className="px-3 py-1 bg-surface-subtle text-text-muted text-xs font-semibold rounded-full flex items-center gap-1">
                              = Neutral
                            </span>
                          )}

                          {/* Amount */}
                          <span className="font-mono text-sm font-semibold text-text-primary w-12 text-right">
                            {factor.amount > 0 && '+'}
                            {factor.amount !== 0 ? `₹${factor.amount}` : '—'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                      <span className="font-display font-semibold text-text-primary">
                        Total Premium
                      </span>
                      <span className="font-display text-2xl font-bold text-brand-primary">
                        ₹{POLICY_DATA.premiumPaid}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Renewal Section */}
        <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-brand-primary-light to-surface-card">
          <div className="space-y-4">
            {/* Days remaining */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-semibold text-text-primary">
                  Coverage ends in {POLICY_DATA.daysRemaining} days
                </span>
                <span className="text-sm text-text-secondary">
                  {Math.round(daysProgress)}% complete
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${daysProgress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>

            {/* Renew button */}
            <button className="w-full py-4 bg-brand-primary hover:bg-brand-primary-hover text-text-inverse font-display font-semibold text-lg rounded-lg shadow-lg transition-colors">
              Renew for next week — ₹{POLICY_DATA.premiumPaid}
            </button>

            {/* Auto-renew toggle */}
            <div className="flex items-start gap-3 p-4 bg-surface-card rounded-lg border border-border">
              <button
                onClick={() => setAutoRenew(!autoRenew)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoRenew ? 'bg-brand-accent' : 'bg-surface-subtle'
                }`}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 bg-surface-card rounded-full shadow-md"
                  animate={{ left: autoRenew ? '28px' : '4px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </button>

              <div className="flex-1">
                <p className="font-medium text-text-primary mb-1">
                  Auto-renew weekly
                </p>
                <p className="text-sm text-text-secondary">
                  We'll automatically renew your coverage every Monday. You can
                  cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer note */}
        <div className="text-center py-4">
          <p className="text-sm text-text-muted">
            Questions about your policy?{' '}
            <button className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
