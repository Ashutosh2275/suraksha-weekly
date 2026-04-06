'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, AmountDisplay } from '@/components/ui';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// Mock data - would come from API in production
const PAYOUTS_DATA = [
  {
    id: 'payout-001',
    eventType: 'Heavy Rain',
    location: 'Andheri East',
    amount: 420,
    status: 'SUCCESS' as const,
    date: '2026-04-02',
    month: 'April 2026',
    eventDate: '2026-04-02T14:30:00Z',
    eventEndDate: '2026-04-02T18:00:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.2,
    upiHandle: 'rav***@oksbi',
    transactionId: 'SRK-4829-XKQP',
    processedAt: '2026-04-02T18:47:00Z',
    policyNumber: 'SW-2026-0342',
    policyPeriod: 'Week 1 Apr – 7 Apr',
  },
  {
    id: 'payout-002',
    eventType: 'Extreme Heat',
    location: 'Central Mumbai',
    amount: 600,
    status: 'SUCCESS' as const,
    date: '2026-04-01',
    month: 'April 2026',
    eventDate: '2026-04-01T13:00:00Z',
    eventEndDate: '2026-04-01T16:30:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.0,
    upiHandle: 'rav***@oksbi',
    transactionId: 'SRK-4821-MNOP',
    processedAt: '2026-04-01T17:15:00Z',
    policyNumber: 'SW-2026-0341',
    policyPeriod: 'Week 1 Apr – 7 Apr',
  },
  {
    id: 'payout-003',
    eventType: 'Heavy Rain',
    location: 'Bandra West',
    amount: 470,
    status: 'PENDING' as const,
    date: '2026-03-28',
    month: 'March 2026',
    eventDate: '2026-03-28T16:00:00Z',
    eventEndDate: '2026-03-28T19:30:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.2,
    upiHandle: 'rav***@oksbi',
    transactionId: null,
    processedAt: null,
    policyNumber: 'SW-2026-0338',
    policyPeriod: 'Week 25 Mar – 31 Mar',
  },
  {
    id: 'payout-004',
    eventType: 'Poor Air Quality',
    location: 'Andheri East',
    amount: 850,
    status: 'SUCCESS' as const,
    date: '2026-03-15',
    month: 'March 2026',
    eventDate: '2026-03-15T10:00:00Z',
    eventEndDate: '2026-03-15T15:00:00Z',
    hoursCovered: 5,
    hourlyRate: 100,
    severityFactor: 0.94,
    upiHandle: 'rav***@oksbi',
    transactionId: 'SRK-4782-ABCD',
    processedAt: '2026-03-15T16:30:00Z',
    policyNumber: 'SW-2026-0335',
    policyPeriod: 'Week 11 Mar – 17 Mar',
  },
];

// Sparkline data (8 weeks)
const SPARKLINE_DATA = [
  { week: 1, amount: 0 },
  { week: 2, amount: 850 },
  { week: 3, amount: 0 },
  { week: 4, amount: 0 },
  { week: 5, amount: 470 },
  { week: 6, amount: 0 },
  { week: 7, amount: 600 },
  { week: 8, amount: 420 },
];

// Custom dot component for glowing effect at the end
const GlowingDot = (props: any) => {
  const { cx, cy, index, points } = props;
  const isLast = index === points.length - 1;
  
  if (!isLast) return null;
  
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="6"
        fill="#FFFFFF"
        opacity="0.3"
        filter="url(#glow)"
      />
      <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" />
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </g>
  );
};

// Empty state component
const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Rain cloud with rupee coins */}
      <motion.svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {/* Cloud */}
        <motion.path
          d="M60 80c0-13.8 11.2-25 25-25 2.8 0 5.5.5 8 1.3C98 45.5 109 37 122 37c16.6 0 30 13.4 30 30 0 1.3-.1 2.5-.3 3.7 9.5 2.5 16.3 11 16.3 21.3 0 12.2-9.8 22-22 22H72c-13.8 0-25-11.2-25-25 0-11.8 8.2-21.7 19.2-24.3-.1-1.2-.2-2.5-.2-3.7z"
          fill="#1B4FCC"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        
        {/* Rupee coins falling */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.g
            key={i}
            initial={{ y: 80, opacity: 0 }}
            animate={{ 
              y: [80, 160, 180],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              repeatDelay: 1
            }}
          >
            <circle
              cx={70 + i * 20}
              cy={100}
              r="8"
              fill="#F5A623"
              stroke="#D4891A"
              strokeWidth="1.5"
            />
            <text
              x={70 + i * 20}
              y={104}
              fontSize="10"
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              ₹
            </text>
          </motion.g>
        ))}
      </motion.svg>

      <motion.h3
        className="font-display text-xl font-bold text-text-primary mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        No payouts yet
      </motion.h3>
      
      <motion.p
        className="text-text-muted text-center max-w-md mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Your first payout happens automatically when a covered event occurs in your zone.
      </motion.p>

      <motion.div
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-emerald/10 text-brand-emerald rounded-full text-sm"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        Right now: No active triggers ✓
      </motion.div>
    </div>
  );
};

// Payout card component
const PayoutCard = ({ payout, index }: { payout: typeof PAYOUTS_DATA[0]; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const date = new Date(payout.date);
  const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  const statusColors = {
    SUCCESS: {
      bg: 'bg-brand-emerald/10',
      border: 'border-brand-emerald/30',
      text: 'text-brand-emerald',
      circle: 'bg-brand-emerald',
    },
    PENDING: {
      bg: 'bg-brand-amber/10',
      border: 'border-brand-amber/30',
      text: 'text-brand-amber',
      circle: 'bg-brand-amber',
    },
    FAILED: {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-600',
      circle: 'bg-gray-400',
    },
  };

  const colors = statusColors[payout.status];

  const copyToClipboard = (text: string, isTxnId = false) => {
    console.log('Copy to clipboard called with:', text.substring(0, 50));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied successfully');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          console.log('Copied using fallback method');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
      });
    }
  };

  const copyReceipt = () => {
    console.log('Copy receipt clicked for payout:', payout.id);
    const receiptText = `
SURAKSHA WEEKLY
Policy: ${payout.policyNumber}
─────────────────────
Event:         ${payout.eventType}
Zone:          ${payout.location}
Event date:    ${new Date(payout.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${new Date(payout.eventDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}–${new Date(payout.eventEndDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
─────────────────────
Hours lost:    ${payout.hoursCovered} hours
Rate:          ₹${payout.hourlyRate} / hour
Severity:      ${payout.severityFactor}×
─────────────────────
TOTAL PAID:    ₹${payout.amount.toFixed(2)}
─────────────────────
${payout.status === 'SUCCESS' ? `Paid to:       ${payout.upiHandle}
Txn ID:        ${payout.transactionId}
Processed:     ${new Date(payout.processedAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${new Date(payout.processedAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC` : 'Status:        Pending'}
─────────────────────
    `.trim();
    
    copyToClipboard(receiptText);
  };

  const handlePrint = () => {
    console.log('Print button clicked');
    window.print();
  };

  const handleCardClick = () => {
    console.log('Card clicked, toggling expansion. Current state:', isExpanded);
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mb-3"
    >
      <Card
        variant="default"
        padding="none"
        className="overflow-hidden"
      >
        <div 
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-card-hover transition-colors"
          onClick={handleCardClick}
        >
          {/* Date circle */}
          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full ${colors.circle} text-white flex-shrink-0`}>
            <div className="text-xs font-medium leading-none">{monthAbbr}</div>
            <div className="text-xl font-display font-bold leading-none mt-0.5">{day}</div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="font-display text-[15px] font-semibold text-text-primary mb-0.5">
              {payout.eventType} · {payout.location}
            </div>
            <div className="text-xs text-text-muted">
              {payout.policyPeriod}
            </div>
          </div>

          {/* Amount & Status */}
          <div className="flex flex-col items-end gap-1.5">
            <div className={`font-display text-lg font-bold ${payout.status === 'SUCCESS' ? 'text-brand-emerald' : 'text-text-muted'}`}>
              ₹{payout.amount}
            </div>
            <Badge status={payout.status === 'SUCCESS' ? 'PAID' : 'PENDING'} size="sm" />
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text-muted text-xl flex-shrink-0"
          >
            ›
          </motion.div>
        </div>

        {/* Receipt expansion */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Dashed separator with label */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center px-4">
                  <div className="w-full border-t border-dashed" style={{ borderColor: 'var(--border-strong, #CBD5E0)' }}></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs uppercase tracking-wider text-text-muted font-medium">
                    Receipt
                  </span>
                </div>
              </div>

              {/* Receipt content */}
              <div 
                className="px-4 pb-4 font-mono text-sm"
                style={{
                  backgroundImage: 'radial-gradient(circle, #00000008 1px, transparent 1px)',
                  backgroundSize: '8px 8px'
                }}
              >
                <div className="text-center text-xs uppercase tracking-widest font-sans font-semibold text-text-secondary mb-2">
                  SURAKSHA WEEKLY
                </div>
                <div className="text-center text-xs text-text-muted mb-3 font-sans">
                  Policy: {payout.policyNumber}
                </div>
                
                <div className="text-center text-xs text-text-muted mb-3">
                  ─────────────────────
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Event:</span>
                    <span className="text-text-primary font-medium">{payout.eventType}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Zone:</span>
                    <span className="text-text-primary font-medium">{payout.location}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Event date:</span>
                    <span className="text-text-primary font-medium">
                      {new Date(payout.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(payout.eventDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}–{new Date(payout.eventEndDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                </div>

                <div className="text-center text-xs text-text-muted my-3">
                  ─────────────────────
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Hours lost:</span>
                    <span className="text-text-primary">{payout.hoursCovered} hours</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Rate:</span>
                    <span className="text-text-primary">₹{payout.hourlyRate} / hour</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-text-muted">Severity:</span>
                    <span className="text-text-primary">{payout.severityFactor}×</span>
                  </div>
                </div>

                <div className="text-center text-xs text-text-muted my-3">
                  ─────────────────────
                </div>

                <div className="flex justify-between text-sm font-sans font-bold mb-3">
                  <span className="text-text-primary">TOTAL PAID:</span>
                  <span className="text-text-primary">₹{payout.amount.toFixed(2)}</span>
                </div>

                <div className="text-center text-xs text-text-muted mb-3">
                  ─────────────────────
                </div>

                {payout.status === 'SUCCESS' ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-sans">
                      <span className="text-text-muted">Paid to:</span>
                      <span className="text-text-primary">{payout.upiHandle}</span>
                    </div>
                    <div className="flex justify-between items-center font-sans">
                      <span className="text-text-muted">Txn ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary">{payout.transactionId}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Transaction ID copy clicked');
                            copyToClipboard(payout.transactionId!, true);
                          }}
                          className="text-brand-indigo hover:text-brand-indigo-dark text-xs px-1.5 py-0.5 rounded hover:bg-brand-indigo/10 transition-colors cursor-pointer"
                        >
                          {copied ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between font-sans">
                      <span className="text-text-muted">Processed:</span>
                      <span className="text-text-primary">
                        {new Date(payout.processedAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(payout.processedAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs font-sans">
                    <span className="text-text-muted">Status: </span>
                    <span className="text-brand-amber font-medium">Pending</span>
                  </div>
                )}

                <div className="text-center text-xs text-text-muted mt-3 mb-4">
                  ─────────────────────
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Copy summary button clicked');
                      copyReceipt();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-indigo/10 hover:bg-brand-indigo/20 text-brand-indigo rounded-lg transition-colors text-xs font-sans font-medium cursor-pointer"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy summary'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Print button clicked');
                      handlePrint();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-indigo/10 hover:bg-brand-indigo/20 text-brand-indigo rounded-lg transition-colors text-xs font-sans font-medium cursor-pointer"
                  >
                    🖨 Save receipt
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default function PayoutsPage() {
  // Calculate totals
  const totalAmount = PAYOUTS_DATA.reduce((sum, p) => sum + (p.status === 'SUCCESS' ? p.amount : 0), 0);
  const totalPayouts = PAYOUTS_DATA.filter(p => p.status === 'SUCCESS').length;

  // Group payouts by month
  const payoutsByMonth = PAYOUTS_DATA.reduce((acc, payout) => {
    if (!acc[payout.month]) {
      acc[payout.month] = [];
    }
    acc[payout.month].push(payout);
    return acc;
  }, {} as Record<string, typeof PAYOUTS_DATA>);

  const hasPayouts = PAYOUTS_DATA.length > 0;

  return (
    <div className="min-h-screen bg-surface-page pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-surface-card border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-display text-2xl font-bold text-text-primary mb-1">
            Payouts
          </h1>
          <p className="text-sm text-text-muted">
            All earnings from your Suraksha coverage
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {hasPayouts ? (
          <>
            {/* Summary Strip */}
            <div
              className="mb-6 rounded-lg p-8 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #1B4FCC 0%, #1440A8 100%)',
              }}
            >
              <div className="flex items-center justify-between gap-6">
                {/* Left side */}
                <div className="flex-1">
                  <div className="text-white/60 text-[13px] mb-2">
                    Total received
                  </div>
                  <div className="mb-1">
                    <AmountDisplay 
                      amount={totalAmount} 
                      size="lg"
                      showRupee={true}
                      animate={true}
                      className="text-white [&>span]:!text-white"
                    />
                  </div>
                  <div className="text-white/60 text-[13px]">
                    Across {totalPayouts} payout{totalPayouts !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Right side - Sparkline */}
                <div className="w-32 h-20 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={SPARKLINE_DATA}>
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        dot={<GlowingDot />}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Payout History */}
            <div className="space-y-6">
              {Object.entries(payoutsByMonth).map(([month, payouts], monthIndex) => (
                <div key={month}>
                  {/* Month divider */}
                  <h2 className="text-[13px] uppercase tracking-wider text-text-muted mb-3 font-medium">
                    {month}
                  </h2>

                  {/* Payout cards */}
                  <div>
                    {payouts.map((payout, payoutIndex) => (
                      <PayoutCard
                        key={payout.id}
                        payout={payout}
                        index={monthIndex * 10 + payoutIndex}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
