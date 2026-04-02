'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge } from '@/components/ui';

// Mock data - would come from API in production
const CLAIMS_DATA = [
  {
    id: 'claim-001',
    triggerEvent: {
      type: 'rain',
      label: 'Heavy Rain',
      icon: '🌧️',
      zone: 'Andheri East',
      eventTime: '2026-03-30T14:30:00Z',
      dataSource: 'IMD Weather Station - Andheri',
    },
    status: 'PAID' as const,
    date: '2026-03-30',
    amount: 850,
    details: {
      eligibilityChecks: [
        { item: 'Active coverage at time of event', passed: true },
        { item: 'Event severity threshold met (>50mm rainfall)', passed: true },
        { item: 'Location verified in coverage zone', passed: true },
        { item: 'No duplicate claims for same event', passed: true },
      ],
      explanation:
        'Heavy rainfall (62mm in 3 hours) was recorded in your zone during your active coverage period. You were automatically approved for payout.',
      transactionId: 'TXN8472910365',
      paidAt: '2026-03-30T16:45:00Z',
    },
  },
  {
    id: 'claim-002',
    triggerEvent: {
      type: 'heat',
      label: 'Heat Wave',
      icon: '🔥',
      zone: 'Central Mumbai',
      eventTime: '2026-03-28T13:00:00Z',
      dataSource: 'IMD Temperature Monitor',
    },
    status: 'IN_REVIEW' as const,
    date: '2026-03-28',
    amount: 600,
    details: {
      eligibilityChecks: [
        { item: 'Active coverage at time of event', passed: true },
        { item: 'Temperature threshold met (>42°C)', passed: true },
        { item: 'Location verified in coverage zone', passed: true },
        { item: 'Verifying work hours during event', passed: null }, // null = checking
      ],
      explanation:
        'We're verifying your work hours during the heat wave event. This usually takes 24-48 hours.',
      transactionId: null,
      paidAt: null,
    },
  },
  {
    id: 'claim-003',
    triggerEvent: {
      type: 'rain',
      label: 'Moderate Rain',
      icon: '🌧️',
      zone: 'Bandra West',
      eventTime: '2026-02-15T10:00:00Z',
      dataSource: 'IMD Weather Station - Bandra',
    },
    status: 'REJECTED' as const,
    date: '2026-02-15',
    amount: 0,
    details: {
      eligibilityChecks: [
        { item: 'Active coverage at time of event', passed: true },
        { item: 'Event severity threshold met (>50mm rainfall)', passed: false },
        { item: 'Location verified in coverage zone', passed: true },
        { item: 'No duplicate claims for same event', passed: true },
      ],
      explanation:
        'The rainfall recorded (38mm) did not meet our threshold of 50mm in 3 hours. This threshold ensures we only trigger payouts for events that significantly impact delivery work.',
      rejectionReason:
        'Rainfall intensity below coverage threshold (38mm recorded, 50mm required)',
      transactionId: null,
      paidAt: null,
    },
  },
];

type ClaimStatus = 'INITIATED' | 'IN_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';

const STATUS_CONFIG: Record<
  ClaimStatus,
  { label: string; variant: 'neutral' | 'warning' | 'accent' | 'success'; barColor: string }
> = {
  INITIATED: {
    label: 'Checking eligibility...',
    variant: 'neutral',
    barColor: '#4A5568',
  },
  IN_REVIEW: {
    label: 'Being reviewed by our team',
    variant: 'warning',
    barColor: '#F5A623',
  },
  APPROVED: {
    label: 'Approved — payout processing',
    variant: 'accent',
    barColor: '#1B4FCC',
  },
  PAID: {
    label: 'Paid to your UPI',
    variant: 'success',
    barColor: '#00C896',
  },
  REJECTED: {
    label: 'Not eligible this time',
    variant: 'neutral',
    barColor: '#A0AEC0',
  },
};

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Umbrella SVG Illustration */}
      <motion.svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {/* Umbrella */}
        <motion.path
          d="M100 60 C60 60, 40 80, 40 100 L100 100"
          stroke="#1B4FCC"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />
        <motion.path
          d="M100 60 C140 60, 160 80, 160 100 L100 100"
          stroke="#F5A623"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />
        {/* Umbrella handle */}
        <motion.path
          d="M100 100 L100 140 Q100 145, 95 145"
          stroke="#1B4FCC"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        />
        {/* Rider head */}
        <motion.circle
          cx="85"
          cy="110"
          r="8"
          fill="#0D1B3E"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1 }}
        />
        {/* Rider body */}
        <motion.path
          d="M85 118 L85 145"
          stroke="#0D1B3E"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        />
        {/* Arms */}
        <motion.path
          d="M85 125 L70 135"
          stroke="#0D1B3E"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.2 }}
        />
        <motion.path
          d="M85 125 L95 115"
          stroke="#0D1B3E"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.3 }}
        />
        {/* Legs */}
        <motion.path
          d="M85 145 L75 165"
          stroke="#0D1B3E"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.4 }}
        />
        <motion.path
          d="M85 145 L95 165"
          stroke="#0D1B3E"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.5 }}
        />
        {/* Rain drops */}
        {[...Array(6)].map((_, i) => (
          <motion.circle
            key={i}
            cx={30 + i * 25}
            cy={30 + (i % 2) * 10}
            r="2"
            fill="#A5B4FC"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: [0, 1, 0], y: [0, 10, 20] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2 + 1.6,
            }}
          />
        ))}
      </motion.svg>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="font-display text-2xl font-semibold text-text-primary mb-3"
      >
        No claims yet
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-text-secondary text-center max-w-md leading-relaxed"
      >
        When a weather or disruption event triggers your coverage, your claim
        will appear here automatically. No action needed from you.
      </motion.p>
    </div>
  );
};

const ClaimCard = ({ claim }: { claim: typeof CLAIMS_DATA[0] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const statusConfig = STATUS_CONFIG[claim.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {/* Colored left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: statusConfig.barColor }}
      />

      <Card
        variant={claim.status === 'PAID' ? 'elevated' : 'default'}
        padding="lg"
        className={`ml-4 cursor-pointer transition-all ${
          claim.status === 'PAID'
            ? 'bg-gradient-to-br from-brand-accent-light to-surface-card'
            : claim.status === 'REJECTED'
            ? 'opacity-75'
            : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top row: Icon + Type + Date */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{claim.triggerEvent.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-text-primary">
                {claim.triggerEvent.label}
              </h3>
              <p className="text-sm text-text-secondary">
                {formatDate(claim.triggerEvent.eventTime)}
              </p>
            </div>
          </div>

          {/* Expand indicator */}
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text-muted flex-shrink-0"
          >
            <path
              d="M5 7l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </div>

        {/* Middle: Status badge */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>

            {/* Pulsing dot for IN_REVIEW */}
            {claim.status === 'IN_REVIEW' && (
              <motion.div
                className="w-2 h-2 rounded-full bg-brand-warning"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Checkmark for PAID */}
            {claim.status === 'PAID' && (
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-brand-accent"
              >
                <circle cx="10" cy="10" r="9" fill="currentColor" fillOpacity="0.2" />
                <motion.path
                  d="M6 10l3 3 5-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </motion.svg>
            )}
          </div>
        </div>

        {/* Bottom: Amount */}
        {claim.amount > 0 && (
          <div className="flex justify-end">
            <p className="font-display text-xl font-semibold text-text-primary">
              ₹{claim.amount.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-border-subtle space-y-6">
                {/* Trigger event details */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">
                    Event Details
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-text-secondary">
                      <span className="font-medium">Zone:</span>{' '}
                      {claim.triggerEvent.zone}
                    </p>
                    <p className="text-text-secondary">
                      <span className="font-medium">Time:</span>{' '}
                      {formatDate(claim.triggerEvent.eventTime)}
                    </p>
                    <p className="text-text-secondary">
                      <span className="font-medium">Data source:</span>{' '}
                      {claim.triggerEvent.dataSource}
                    </p>
                  </div>
                </div>

                {/* Eligibility checks */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">
                    Eligibility Checks
                  </h4>
                  <div className="space-y-2">
                    {claim.details.eligibilityChecks.map((check, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {check.passed === true ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-brand-accent flex-shrink-0 mt-0.5"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              fill="currentColor"
                              fillOpacity="0.1"
                            />
                            <path
                              d="M6 10l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : check.passed === false ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-text-muted flex-shrink-0 mt-0.5"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              fill="currentColor"
                              fillOpacity="0.1"
                            />
                            <path
                              d="M7 7l6 6M13 7l-6 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <motion.svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-brand-warning flex-shrink-0 mt-0.5"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray="40 10"
                            />
                          </motion.svg>
                        )}
                        <span className="text-sm text-text-secondary">
                          {check.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-surface-subtle p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-text-primary mb-2">
                    {claim.status === 'REJECTED' ? 'Why was this rejected?' : 'Decision'}
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {claim.details.explanation}
                  </p>
                </div>

                {/* Transaction ID for PAID */}
                {claim.status === 'PAID' && claim.details.transactionId && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">
                      Transaction ID
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-surface-subtle px-3 py-2 rounded">
                        {claim.details.transactionId}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(claim.details.transactionId!);
                        }}
                        className="p-2 hover:bg-surface-subtle rounded transition-colors"
                      >
                        {copied ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-brand-accent"
                          >
                            <path
                              d="M6 10l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-text-secondary"
                          >
                            <rect
                              x="8"
                              y="8"
                              width="9"
                              height="9"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path
                              d="M5 12V4a1 1 0 011-1h7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Paid {formatDate(claim.details.paidAt!)}
                    </p>
                  </div>
                )}

                {/* Dispute link for REJECTED */}
                {claim.status === 'REJECTED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Would open dispute form
                    }}
                    className="text-sm text-brand-primary hover:text-brand-primary-hover font-medium flex items-center gap-1"
                  >
                    Dispute this decision
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 12l4-4-4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default function ClaimsPage() {
  // In production, this would come from API
  const claims = CLAIMS_DATA; // Change to [] to test empty state
  const hasClaims = claims.length > 0;

  // Group claims by time period
  const groupedClaims = hasClaims
    ? claims.reduce(
        (acc, claim) => {
          const claimDate = new Date(claim.date);
          const now = new Date();
          const daysDiff = Math.floor(
            (now.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 7) {
            acc.thisWeek.push(claim);
          } else if (daysDiff <= 14) {
            acc.lastWeek.push(claim);
          } else {
            acc.earlier.push(claim);
          }

          return acc;
        },
        { thisWeek: [], lastWeek: [], earlier: [] } as Record<
          string,
          typeof CLAIMS_DATA
        >
      )
    : null;

  return (
    <div className="min-h-screen bg-surface-base pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-surface-card border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Claims
          </h1>
          <p className="text-text-secondary mt-1">
            Track your coverage triggers and payouts
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!hasClaims ? (
          <EmptyState />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border-subtle ml-2" />

            <div className="space-y-8">
              {/* This Week */}
              {groupedClaims!.thisWeek.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 rounded-full bg-brand-primary flex-shrink-0" />
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      This Week
                    </h2>
                  </div>
                  <div className="space-y-4 ml-6">
                    {groupedClaims!.thisWeek.map((claim) => (
                      <ClaimCard key={claim.id} claim={claim} />
                    ))}
                  </div>
                </div>
              )}

              {/* Last Week */}
              {groupedClaims!.lastWeek.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 rounded-full bg-text-secondary flex-shrink-0" />
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      Last Week
                    </h2>
                  </div>
                  <div className="space-y-4 ml-6">
                    {groupedClaims!.lastWeek.map((claim) => (
                      <ClaimCard key={claim.id} claim={claim} />
                    ))}
                  </div>
                </div>
              )}

              {/* Earlier */}
              {groupedClaims!.earlier.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 rounded-full bg-text-muted flex-shrink-0" />
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      Earlier
                    </h2>
                  </div>
                  <div className="space-y-4 ml-6">
                    {groupedClaims!.earlier.map((claim) => (
                      <ClaimCard key={claim.id} claim={claim} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
