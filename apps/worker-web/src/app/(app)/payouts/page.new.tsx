'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui'

// ===== TYPES =====
type PayoutStatus = 'SUCCESS' | 'PENDING' | 'FAILED'

interface Payout {
  id: string
  date: string
  month: string
  day: string
  monthAbbr: string
  triggerEvent: string
  zone: string
  policyPeriod: string
  amount: number
  status: PayoutStatus
  receipt: Receipt
}

interface Receipt {
  policyId: string
  eventType: string
  zone: string
  eventDate: string
  eventTime: string
  hoursLost: number
  hourlyRate: number
  severityFactor: number
  totalPaid: number
  paidTo: string
  transactionId: string
  processedAt: string
}

// ===== MOCK DATA =====
const SPARKLINE_DATA = [
  { week: 1, amount: 0 },
  { week: 2, amount: 850 },
  { week: 3, amount: 850 },
  { week: 4, amount: 1270 },
  { week: 5, amount: 1690 },
  { week: 6, amount: 1690 },
  { week: 7, amount: 2340 },
  { week: 8, amount: 2340 },
]

const PAYOUTS: Payout[] = [
  {
    id: 'PO-001',
    date: '2026-04-02',
    month: 'April 2026',
    day: '2',
    monthAbbr: 'APR',
    triggerEvent: 'Heavy Rain',
    zone: 'Andheri East',
    policyPeriod: 'Week 1 Apr – 7 Apr',
    amount: 420,
    status: 'SUCCESS',
    receipt: {
      policyId: 'SW-2026-0342',
      eventType: 'Heavy Rain',
      zone: 'Andheri East',
      eventDate: '2 Apr',
      eventTime: '14:30–18:00',
      hoursLost: 3.5,
      hourlyRate: 100,
      severityFactor: 1.2,
      totalPaid: 420,
      paidTo: 'rav***@oksbi',
      transactionId: 'SRK-4829-XKQP',
      processedAt: '2 Apr · 18:47 UTC',
    },
  },
  {
    id: 'PO-002',
    date: '2026-03-28',
    month: 'March 2026',
    day: '28',
    monthAbbr: 'MAR',
    triggerEvent: 'Extreme Heat',
    zone: 'Bandra',
    policyPeriod: 'Week 25 Mar – 31 Mar',
    amount: 650,
    status: 'SUCCESS',
    receipt: {
      policyId: 'SW-2026-0338',
      eventType: 'Extreme Heat',
      zone: 'Bandra',
      eventDate: '28 Mar',
      eventTime: '13:00–17:30',
      hoursLost: 4.5,
      hourlyRate: 100,
      severityFactor: 1.4,
      totalPaid: 650,
      paidTo: 'rav***@oksbi',
      transactionId: 'SRK-4821-MPQR',
      processedAt: '28 Mar · 19:15 UTC',
    },
  },
  {
    id: 'PO-003',
    date: '2026-03-20',
    month: 'March 2026',
    day: '20',
    monthAbbr: 'MAR',
    triggerEvent: 'Heavy Rain',
    zone: 'Worli',
    policyPeriod: 'Week 18 Mar – 24 Mar',
    amount: 420,
    status: 'SUCCESS',
    receipt: {
      policyId: 'SW-2026-0334',
      eventType: 'Heavy Rain',
      zone: 'Worli',
      eventDate: '20 Mar',
      eventTime: '11:00–15:00',
      hoursLost: 4.0,
      hourlyRate: 100,
      severityFactor: 1.05,
      totalPaid: 420,
      paidTo: 'rav***@oksbi',
      transactionId: 'SRK-4815-JKLM',
      processedAt: '20 Mar · 16:30 UTC',
    },
  },
  {
    id: 'PO-004',
    date: '2026-03-12',
    month: 'March 2026',
    day: '12',
    monthAbbr: 'MAR',
    triggerEvent: 'Heavy Rain',
    zone: 'Andheri East',
    policyPeriod: 'Week 11 Mar – 17 Mar',
    amount: 850,
    status: 'SUCCESS',
    receipt: {
      policyId: 'SW-2026-0330',
      eventType: 'Heavy Rain',
      zone: 'Andheri East',
      eventDate: '12 Mar',
      eventTime: '09:30–15:00',
      hoursLost: 5.5,
      hourlyRate: 100,
      severityFactor: 1.5,
      totalPaid: 850,
      paidTo: 'rav***@oksbi',
      transactionId: 'SRK-4808-ABCD',
      processedAt: '12 Mar · 17:22 UTC',
    },
  },
]

const TOTAL_RECEIVED = PAYOUTS.reduce((sum, p) => sum + p.amount, 0)

// ===== UTILITY FUNCTIONS =====
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const formatAmount = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN')}`
}

const getStatusColor = (status: PayoutStatus) => {
  const colors = {
    SUCCESS: 'var(--brand-emerald)',
    PENDING: 'var(--brand-amber)',
    FAILED: 'var(--text-muted)',
  }
  return colors[status]
}

const generateReceiptText = (payout: Payout) => {
  const r = payout.receipt
  return `SURAKSHA WEEKLY
Policy: #${r.policyId}
─────────────────────
Event:         ${r.eventType}
Zone:          ${r.zone}
Event date:    ${r.eventDate} · ${r.eventTime}
─────────────────────
Hours lost:    ${r.hoursLost} hours
Rate:          ₹${r.hourlyRate} / hour
Severity:      ${r.severityFactor}×
─────────────────────
TOTAL PAID:    ₹${r.totalPaid.toFixed(2)}
─────────────────────
Paid to:       ${r.paidTo}
Txn ID:        ${r.transactionId}
Processed:     ${r.processedAt}
─────────────────────

Thank you for trusting Suraksha Weekly!`
}

// ===== COMPONENTS =====

// AmountDisplay Component (simplified count-up version)
function AmountDisplay({ amount }: { amount: number }) {
  const [displayAmount, setDisplayAmount] = useState(0)

  useEffect(() => {
    let frame = 0
    const totalFrames = 60 // 1 second at 60fps
    
    const animate = () => {
      frame++
      const progress = Math.min(frame / totalFrames, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayAmount(Math.floor(amount * eased))
      
      if (frame < totalFrames) {
        requestAnimationFrame(animate)
      } else {
        setDisplayAmount(amount)
      }
    }
    
    requestAnimationFrame(animate)
  }, [amount])

  return (
    <span className="font-[family-name:var(--font-sora)] font-bold text-4xl text-white">
      ₹{displayAmount.toLocaleString('en-IN')}
    </span>
  )
}

// Header
function PayoutsHeader() {
  return (
    <div className="px-4 py-5">
      <h1 className="font-[family-name:var(--font-sora)] font-bold text-2xl text-[var(--text-primary)] mb-1">
        Payouts
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        All earnings from your Suraksha coverage
      </p>
    </div>
  )
}

// Summary Strip
function SummaryStrip({ total, count, sparklineData }: { total: number; count: number; sparklineData: any[] }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mx-4 mb-5 rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--brand-indigo) 0%, var(--brand-indigo-dark) 100%)',
      }}
    >
      <div className="p-5 flex items-center justify-between">
        {/* Left: Total */}
        <div>
          <p className="text-[13px] text-white/60 mb-1">Total received</p>
          <AmountDisplay amount={total} />
          <p className="text-[13px] text-white/60 mt-1">Across {count} payouts</p>
        </div>

        {/* Right: Sparkline */}
        <div className="w-32 h-16 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="amount"
                stroke="white"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Glowing dot at end */}
          <motion.div
            className="absolute top-1/2 right-0 w-2 h-2 bg-white rounded-full"
            animate={{
              boxShadow: [
                '0 0 4px 2px rgba(255,255,255,0.6)',
                '0 0 8px 4px rgba(255,255,255,0.8)',
                '0 0 4px 2px rgba(255,255,255,0.6)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.div>
  )
}

// Date Circle
function DateCircle({ monthAbbr, day, status }: { monthAbbr: string; day: string; status: PayoutStatus }) {
  return (
    <div
      className="w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0"
      style={{ background: getStatusColor(status) + '20', border: `2px solid ${getStatusColor(status)}` }}
    >
      <span className="text-xs font-medium" style={{ color: getStatusColor(status) }}>
        {monthAbbr}
      </span>
      <span className="font-[family-name:var(--font-sora)] font-bold text-xl" style={{ color: getStatusColor(status) }}>
        {day}
      </span>
    </div>
  )
}

// Receipt Component
function Receipt({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copiedTxn, setCopiedTxn] = useState(false)

  const handleCopySummary = async () => {
    const text = generateReceiptText(payout)
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyTxn = async () => {
    const success = await copyToClipboard(payout.receipt.transactionId)
    if (success) {
      setCopiedTxn(true)
      setTimeout(() => setCopiedTxn(false), 2000)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const r = payout.receipt

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      {/* Ticket stub separator */}
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dashed border-[var(--border-strong)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Receipt
          </span>
        </div>
      </div>

      {/* Receipt body */}
      <div
        className="p-4 rounded-lg"
        style={{
          background: 'white',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Header */}
        <div className="text-center mb-4 pb-3 border-b border-[var(--border-default)]">
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm tracking-wider text-[var(--text-primary)] uppercase">
            Suraksha Weekly
          </h3>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[var(--text-muted)] mt-1">
            Policy: #{r.policyId}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Event:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.eventType}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Zone:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.zone}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Event date:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.eventDate} · {r.eventTime}
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--border-default)] my-3" />

        {/* Calculation */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Hours lost:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.hoursLost} hours
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Rate:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              ₹{r.hourlyRate} / hour
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Severity:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.severityFactor}×
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--border-default)] my-3" />

        {/* Total */}
        <div className="flex justify-between items-center mb-4 p-2 bg-[var(--brand-emerald-light)] rounded">
          <span className="font-semibold text-[var(--text-primary)]">TOTAL PAID:</span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-lg text-[var(--brand-emerald)]">
            ₹{r.totalPaid.toFixed(2)}
          </span>
        </div>

        <div className="border-t border-[var(--border-default)] my-3" />

        {/* Transaction details */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Paid to:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.paidTo}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">Txn ID:</span>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
                {r.transactionId}
              </span>
              <button
                onClick={handleCopyTxn}
                className="text-xs text-[var(--brand-indigo)] hover:underline"
              >
                {copiedTxn ? '✓' : 'copy'}
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Processed:</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[var(--text-primary)]">
              {r.processedAt}
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--border-default)] pt-3" />

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCopySummary}
            className="flex-1 h-10 flex items-center justify-center gap-2 bg-white border-2 border-[var(--border-default)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <span>📋</span>
            {copied ? 'Copied!' : 'Copy summary'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 h-10 flex items-center justify-center gap-2 bg-white border-2 border-[var(--border-default)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <span>🖨</span>
            Save receipt
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Payout Row
function PayoutRow({ payout, index }: { payout: Payout; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="mb-3"
    >
      <div className="bg-white shadow-[var(--shadow-sm)] rounded-[var(--radius-lg)] overflow-hidden">
        {/* Main row */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center gap-4 hover:bg-[var(--surface-subtle)] transition-colors"
        >
          {/* Left: Date circle */}
          <DateCircle monthAbbr={payout.monthAbbr} day={payout.day} status={payout.status} />

          {/* Center: Event details */}
          <div className="flex-1 text-left min-w-0">
            <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[15px] text-[var(--text-primary)] truncate">
              {payout.triggerEvent} · {payout.zone}
            </h3>
            <p className="text-xs text-[var(--text-muted)] truncate">{payout.policyPeriod}</p>
          </div>

          {/* Right: Amount + status */}
          <div className="text-right flex-shrink-0">
            <p
              className="font-[family-name:var(--font-sora)] font-bold text-lg mb-1"
              style={{ color: payout.status === 'SUCCESS' ? 'var(--brand-emerald)' : 'var(--text-muted)' }}
            >
              {formatAmount(payout.amount)}
            </p>
            <Badge status={payout.status} size="sm" />
          </div>

          {/* Chevron */}
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <path
              d="M7 15l5-5-5-5"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>

        {/* Expanded receipt */}
        <AnimatePresence>
          {isExpanded && (
            <div className="px-4 pb-4">
              <Receipt payout={payout} onClose={() => setIsExpanded(false)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Payout History List
function PayoutHistoryList({ payouts }: { payouts: Payout[] }) {
  // Group by month
  const groupedPayouts: { [key: string]: Payout[] } = {}
  payouts.forEach((payout) => {
    if (!groupedPayouts[payout.month]) {
      groupedPayouts[payout.month] = []
    }
    groupedPayouts[payout.month].push(payout)
  })

  let index = 0

  return (
    <div className="px-4 pb-6">
      {Object.entries(groupedPayouts).map(([month, monthPayouts]) => (
        <div key={month} className="mb-6">
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-3">
            {month}
          </h2>
          {monthPayouts.map((payout) => {
            const currentIndex = index
            index++
            return <PayoutRow key={payout.id} payout={payout} index={currentIndex} />
          })}
        </div>
      ))}
    </div>
  )
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* SVG: Rain cloud with rupee coins */}
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" className="mb-6">
        {/* Cloud */}
        <ellipse
          cx="100"
          cy="80"
          rx="50"
          ry="30"
          fill="var(--brand-indigo)"
          fillOpacity="0.2"
        />
        <ellipse
          cx="80"
          cy="75"
          rx="35"
          ry="25"
          fill="var(--brand-indigo)"
          fillOpacity="0.2"
        />
        <ellipse
          cx="120"
          cy="75"
          rx="35"
          ry="25"
          fill="var(--brand-indigo)"
          fillOpacity="0.2"
        />
        <path
          d="M60 80c0-20 15-35 35-35s35 15 35 35"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Rupee coins falling */}
        <g opacity="0.7">
          {/* Coin 1 */}
          <motion.g
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          >
            <circle cx="70" cy="110" r="12" fill="var(--brand-amber)" />
            <text
              x="70"
              y="116"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="white"
            >
              ₹
            </text>
          </motion.g>

          {/* Coin 2 */}
          <motion.g
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          >
            <circle cx="100" cy="120" r="12" fill="var(--brand-amber)" />
            <text
              x="100"
              y="126"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="white"
            >
              ₹
            </text>
          </motion.g>

          {/* Coin 3 */}
          <motion.g
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          >
            <circle cx="130" cy="110" r="12" fill="var(--brand-amber)" />
            <text
              x="130"
              y="116"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="white"
            >
              ₹
            </text>
          </motion.g>
        </g>
      </svg>

      <h2 className="font-[family-name:var(--font-sora)] font-bold text-xl text-[var(--text-primary)] mb-3">
        No payouts yet
      </h2>

      <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[320px] mb-4">
        Your first payout happens automatically when a covered event occurs in your zone.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-emerald-light)] text-[var(--brand-emerald)] text-sm">
        <span>Right now: No active triggers</span>
        <span>✓</span>
      </div>
    </div>
  )
}

// ===== MAIN COMPONENT =====
export default function PayoutsPage() {
  const hasPayouts = PAYOUTS.length > 0

  return (
    <div className="min-h-screen bg-[var(--surface-page)] max-w-[480px] mx-auto pb-20">
      {/* Header */}
      <PayoutsHeader />

      {hasPayouts ? (
        <>
          {/* Summary Strip */}
          <SummaryStrip
            total={TOTAL_RECEIVED}
            count={PAYOUTS.length}
            sparklineData={SPARKLINE_DATA}
          />

          {/* Payout History */}
          <PayoutHistoryList payouts={PAYOUTS} />
        </>
      ) : (
        <EmptyState />
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  )
}
