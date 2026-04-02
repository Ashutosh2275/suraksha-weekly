'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts';

// Mock data - would come from API in production
const PAYOUTS_DATA = [
  {
    id: 'payout-001',
    eventType: 'Heavy Rain',
    location: 'Andheri East',
    amount: 850,
    status: 'SUCCESS' as const,
    date: '2026-03-30',
    eventDate: '2026-03-30T14:30:00Z',
    eventEndDate: '2026-03-30T18:00:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.2,
    upiHandle: 'rav***@oksbi',
    transactionId: 'TXN8472910365',
    processedAt: '2026-03-30T18:47:00Z',
  },
  {
    id: 'payout-002',
    eventType: 'Extreme Heat',
    location: 'Central Mumbai',
    amount: 600,
    status: 'PENDING' as const,
    date: '2026-03-28',
    eventDate: '2026-03-28T13:00:00Z',
    eventEndDate: '2026-03-28T16:30:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.0,
    upiHandle: 'rav***@oksbi',
    transactionId: null,
    processedAt: null,
  },
  {
    id: 'payout-003',
    eventType: 'Heavy Rain',
    location: 'Bandra West',
    amount: 420,
    status: 'SUCCESS' as const,
    date: '2026-03-15',
    eventDate: '2026-03-15T16:00:00Z',
    eventEndDate: '2026-03-15T19:30:00Z',
    hoursCovered: 3.5,
    hourlyRate: 100,
    severityFactor: 1.2,
    upiHandle: 'rav***@oksbi',
    transactionId: 'TXN8412845273',
    processedAt: '2026-03-15T20:15:00Z',
  },
  {
    id: 'payout-004',
    eventType: 'Poor Air Quality',
    location: 'Andheri East',
    amount: 470,
    status: 'SUCCESS' as const,
    date: '2026-02-28',
    eventDate: '2026-02-28T10:00:00Z',
    eventEndDate: '2026-02-28T15:00:00Z',
    hoursCovered: 5,
    hourlyRate: 100,
    severityFactor: 0.94,
    upiHandle: 'rav***@oksbi',
    transactionId: 'TXN8398234122',
    processedAt: '2026-02-28T16:30:00Z',
  },
];

// Weekly chart data (8 weeks)
const WEEKLY_CHART_DATA = [
  { week: 'W1', amount: 0 },
  { week: 'W2', amount: 470 },
  { week: 'W3', amount: 0 },
  { week: 'W4', amount: 0 },
  { week: 'W5', amount: 420 },
  { week: 'W6', amount: 0 },
  { week: 'W7', amount: 600 },
  { week: 'W8', amount: 850 },
];

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Piggy bank with shield illustration */}
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
        {/* Piggy bank body */}
        <motion.ellipse
          cx="100"
          cy="110"
          rx="50"
          ry="40"
          fill="#1B4FCC"
          fillOpacity="0.1"
          stroke="#1B4FCC"
          strokeWidth="3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        {/* Piggy bank head */}
        <motion.circle
          cx="140"
          cy="95"
          r="20"
          fill="#1B4FCC"
          fillOpacity="0.1"
          stroke="#1B4FCC"
          strokeWidth="3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
        {/* Snout */}
        <motion.ellipse
          cx="155"
          cy="95"
          rx="8"
          ry="6"
          fill="#1B4FCC"
          fillOpacity="0.2"
          stroke="#1B4FCC"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        />
        {/* Nostril */}
        <circle cx="153" cy="94" r="1.5" fill="#1B4FCC" />
        <circle cx="157" cy="96" r="1.5" fill="#1B4FCC" />
        {/* Eye */}
        <motion.circle
          cx="145"
          cy="90"
          r="2.5"
          fill="#1B4FCC"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.5 }}
        />
        {/* Ear */}
        <motion.ellipse
          cx="135"
          cy="80"
          rx="6"
          ry="10"
          fill="#1B4FCC"
          fillOpacity="0.2"
          stroke="#1B4FCC"
          strokeWidth="2"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        />
        {/* Legs */}
        {[75, 95, 105, 125].map((x, i) => (
          <motion.rect
            key={i}
            x={x}
            y="145"
            width="8"
            height="15"
            rx="4"
            fill="#1B4FCC"
            fillOpacity="0.2"
            stroke="#1B4FCC"
            strokeWidth="2"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
            style={{ transformOrigin: 'center top' }}
          />
        ))}
        {/* Tail */}
        <motion.path
          d="M55 100 Q45 95, 40 100"
          stroke="#1B4FCC"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        />
        {/* Coin slot */}
        <motion.line
          x1="95"
          y1="85"
          x2="105"
          y2="85"
          stroke="#F5A623"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.2 }}
        />
        {/* Shield on piggy bank */}
        <motion.g
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4, type: 'spring' }}
        >
          <path
            d="M100 105 L85 110 v8 c0 8 7 15 15 16 8-1 15-8 15-16 v-8 L100 105z"
            fill="#00C896"
            fillOpacity="0.2"
            stroke="#00C896"
            strokeWidth="2"
          />
          <path
            d="M93 118 l4 4 8-8"
            stroke="#00C896"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
        {/* Coins falling */}
        {[0, 1].map((i) => (
          <motion.circle
            key={`coin-${i}`}
            cx={98 + i * 4}
            cy={70}
            r="3"
            fill="#F5A623"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: [0, 15, 0], opacity: [0, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5 + 1.5,
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
        No payouts yet
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-text-secondary text-center max-w-md leading-relaxed"
      >
        Your payouts will appear here after approved claims are processed
      </motion.p>
    </div>
  );
};

const PayoutCard = ({ payout }: { payout: typeof PAYOUTS_DATA[0] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return `${start.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}–${end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const getCalendarDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
    };
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `Suraksha Weekly Payout Receipt
Event: ${payout.eventType} — ${payout.location}
Event date: ${formatEventTime(payout.eventDate, payout.eventEndDate)}
Hours covered: ${payout.hoursCovered} hrs
Total payout: ₹${payout.amount}
${payout.transactionId ? `Transaction ID: ${payout.transactionId}` : ''}`;
    
    navigator.clipboard.writeText(text);
    alert('Receipt summary copied to clipboard!');
  };

  const calendarDay = getCalendarDay(payout.date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3"
    >
      <Card
        variant="default"
        padding="lg"
        className="cursor-pointer hover:border-brand-primary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {/* Calendar Icon */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-brand-primary-light rounded-lg flex flex-col items-center justify-center border border-brand-primary">
              <span className="text-xs font-semibold text-brand-primary uppercase">
                {calendarDay.month}
              </span>
              <span className="text-xl font-display font-bold text-brand-primary">
                {calendarDay.day}
              </span>
            </div>
          </div>

          {/* Center: Event + Amount */}
          <div className="flex-1">
            <p className="text-sm text-text-secondary mb-1">
              {payout.eventType} · {payout.location}
            </p>
            <p className="font-display text-2xl font-semibold text-brand-primary">
              ₹{payout.amount.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-3">
            <Badge variant={payout.status === 'SUCCESS' ? 'success' : 'warning'}>
              {payout.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING'}
            </Badge>
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              animate={{ rotate: isExpanded ? 180 : 0 }}
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
          </div>
        </div>

        {/* Expanded Receipt */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-border-subtle">
                {/* Receipt Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
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
                  <div>
                    <h3 className="font-display font-semibold text-text-primary">
                      Suraksha Weekly
                    </h3>
                    <p className="text-sm text-text-muted">Payout Receipt</p>
                  </div>
                </div>

                {/* Receipt Details Grid */}
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <span className="text-sm text-text-secondary">Event</span>
                    <span className="text-sm font-medium text-text-primary">
                      {payout.eventType} — {payout.location}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <span className="text-sm text-text-secondary">Event date</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatEventTime(payout.eventDate, payout.eventEndDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <span className="text-sm text-text-secondary">Hours covered</span>
                    <span className="text-sm font-medium text-text-primary">
                      {payout.hoursCovered} hrs
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <span className="text-sm text-text-secondary">Hourly rate</span>
                    <span className="text-sm font-medium text-text-primary">
                      ₹{payout.hourlyRate} (based on your earnings)
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <span className="text-sm text-text-secondary">Severity factor</span>
                    <span className="text-sm font-medium text-text-primary">
                      {payout.severityFactor}×
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4 pt-3 border-t border-border-subtle">
                    <span className="text-sm font-semibold text-text-primary">
                      Total payout
                    </span>
                    <span className="font-display text-lg font-bold text-brand-primary">
                      ₹{payout.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-4 pt-3 border-t border-border-subtle">
                    <span className="text-sm text-text-secondary">Paid to</span>
                    <span className="text-sm font-mono text-text-primary">
                      {payout.upiHandle}
                    </span>
                  </div>

                  {payout.transactionId && (
                    <>
                      <div className="grid grid-cols-[140px_1fr] gap-4">
                        <span className="text-sm text-text-secondary">
                          Transaction ID
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-text-primary">
                            {payout.transactionId}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(payout.transactionId!);
                            }}
                            className="p-1 hover:bg-surface-subtle rounded transition-colors"
                          >
                            {copied ? (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="text-brand-accent"
                              >
                                <path
                                  d="M4 8l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="text-text-secondary"
                              >
                                <rect
                                  x="6"
                                  y="6"
                                  width="8"
                                  height="8"
                                  rx="1"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  fill="none"
                                />
                                <path
                                  d="M3 10V3a1 1 0 011-1h6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-[140px_1fr] gap-4">
                        <span className="text-sm text-text-secondary">Processed</span>
                        <span className="text-sm text-text-primary">
                          {formatDateTime(payout.processedAt!)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border-subtle">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadReceipt();
                    }}
                    className="flex-1 py-2 px-4 bg-brand-primary text-text-inverse rounded-lg font-medium hover:bg-brand-primary-hover transition-colors"
                  >
                    Download receipt
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className="py-2 px-4 border border-border rounded-lg font-medium hover:border-brand-primary hover:text-brand-primary transition-colors"
                  >
                    Share
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
  const payouts = PAYOUTS_DATA; // Change to [] to test empty state
  const hasPayouts = payouts.length > 0;

  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-surface-base pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-surface-card border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Payouts
          </h1>
          <p className="text-text-secondary mt-1">Your payout history</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!hasPayouts ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary Strip */}
            <Card variant="elevated" padding="lg" className="mb-8 bg-gradient-to-br from-brand-primary-light to-surface-card">
              <div className="space-y-6">
                {/* Total */}
                <div>
                  <p className="text-sm text-text-secondary mb-2">
                    Total received this year
                  </p>
                  <p className="font-display text-4xl font-bold text-brand-primary mb-1">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Across {payouts.length} payout{payouts.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Bar Chart */}
                <div>
                  <p className="text-xs text-text-muted mb-2">
                    Last 8 weeks
                  </p>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={WEEKLY_CHART_DATA}>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: '#A0AEC0' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#1B4FCC"
                        radius={[4, 4, 0, 0]}
                        opacity={(entry) => (entry.amount > 0 ? 1 : 0.2)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            {/* Payout List */}
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
                Recent payouts
              </h2>

              <div>
                {payouts.map((payout) => (
                  <PayoutCard key={payout.id} payout={payout} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
