'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui'

// ===== TYPES =====
type ClaimStatus = 'PAID' | 'APPROVED' | 'IN_REVIEW' | 'REJECTED' | 'INITIATED'
type TriggerType = 'HEAVY_RAIN' | 'EXTREME_HEAT' | 'SEVERE_POLLUTION'
type FilterStatus = 'ALL' | 'ACTIVE' | 'PAID' | 'REJECTED'
type SortOrder = 'NEWEST' | 'OLDEST'
type DateRange = 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME'

interface Claim {
  id: string
  triggerType: TriggerType
  triggerName: string
  zone: string
  date: string
  time: string
  status: ClaimStatus
  amount: number
  details: ClaimDetails
}

interface ClaimDetails {
  zone: string
  eventTime: string
  eventDuration: string
  source: string
  confidence: number
  metricValue: string
  metricThreshold: string
  eligibilityChecks: EligibilityCheck[]
  payoutCalculation: PayoutCalculation
  transactionId?: string
  upiId?: string
  rejectionReason?: string
  reviewExpectedTime?: string
}

interface EligibilityCheck {
  label: string
  passed: boolean
}

interface PayoutCalculation {
  hourlyRate: number
  hoursAffected: number
  severityFactor: number
  total: number
}

// ===== MOCK DATA =====
const CLAIMS_DATA: Claim[] = [
  {
    id: 'CLM-001',
    triggerType: 'HEAVY_RAIN',
    triggerName: 'Heavy Rain',
    zone: 'Andheri East',
    date: '2 Apr',
    time: '2:30 PM',
    status: 'PAID',
    amount: 420,
    details: {
      zone: 'Andheri East, Mumbai',
      eventTime: '2 Apr 2026 · 14:30 to 18:00',
      eventDuration: '3.5 hours',
      source: 'OpenWeather API',
      confidence: 94,
      metricValue: '22mm/hour',
      metricThreshold: '15mm',
      eligibilityChecks: [
        { label: 'Policy was active during event', passed: true },
        { label: 'Your zone matched the trigger zone', passed: true },
        { label: 'Waiting period had passed', passed: true },
        { label: 'No duplicate claim found', passed: true },
      ],
      payoutCalculation: {
        hourlyRate: 100,
        hoursAffected: 3.5,
        severityFactor: 1.2,
        total: 420,
      },
      transactionId: 'TXN20260402143052',
      upiId: 'rav***@oksbi',
    },
  },
  {
    id: 'CLM-002',
    triggerType: 'EXTREME_HEAT',
    triggerName: 'Extreme Heat',
    zone: 'Bandra',
    date: '28 Mar',
    time: '1:00 PM',
    status: 'IN_REVIEW',
    amount: 350,
    details: {
      zone: 'Bandra, Mumbai',
      eventTime: '28 Mar 2026 · 13:00 to 16:30',
      eventDuration: '3.5 hours',
      source: 'OpenWeather API',
      confidence: 89,
      metricValue: '43°C',
      metricThreshold: '40°C',
      eligibilityChecks: [
        { label: 'Policy was active during event', passed: true },
        { label: 'Your zone matched the trigger zone', passed: true },
        { label: 'Waiting period had passed', passed: true },
        { label: 'No duplicate claim found', passed: true },
      ],
      payoutCalculation: {
        hourlyRate: 100,
        hoursAffected: 3.5,
        severityFactor: 1.0,
        total: 350,
      },
      reviewExpectedTime: '4 hours',
    },
  },
]

// Has active triggers in zone
const HAS_ACTIVE_TRIGGERS = false

// ===== UTILITY FUNCTIONS =====
const getTriggerIcon = (type: TriggerType) => {
  const configs = {
    HEAVY_RAIN: { bg: '#3B82F6', icon: 'rain' },
    EXTREME_HEAT: { bg: '#F97316', icon: 'heat' },
    SEVERE_POLLUTION: { bg: '#6B7280', icon: 'pollution' },
  }
  return configs[type]
}

const getAccentColor = (status: ClaimStatus) => {
  const colors = {
    PAID: 'var(--brand-emerald)',
    APPROVED: 'var(--brand-indigo)',
    IN_REVIEW: 'var(--brand-amber)',
    REJECTED: 'var(--border-default)',
    INITIATED: 'var(--brand-indigo)',
  }
  return colors[status]
}

const getAmountColor = (status: ClaimStatus) => {
  if (status === 'PAID') return 'var(--brand-emerald)'
  if (status === 'APPROVED') return 'var(--brand-indigo)'
  return 'var(--text-muted)'
}

// ===== COMPONENTS =====

// Header
function ClaimsHeader({ onFilterClick }: { onFilterClick: () => void }) {
  return (
    <div className="px-4 py-5 flex items-start justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] font-bold text-2xl text-[var(--text-primary)] mb-1">
          My Claims
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Auto-initiated when a disruption event occurs
        </p>
      </div>
      <button
        onClick={onFilterClick}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 6h14M6 10h8M8 14h4"
            stroke="var(--text-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

// Filter Bottom Sheet
function FilterBottomSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [status, setStatus] = useState<FilterStatus>('ALL')
  const [sort, setSort] = useState<SortOrder>('NEWEST')
  const [dateRange, setDateRange] = useState<DateRange>('ALL_TIME')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 max-w-[480px] mx-auto"
          >
            {/* Handle */}
            <div className="pt-3 pb-4 flex justify-center">
              <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full" />
            </div>

            <div className="px-5 pb-6">
              <h2 className="font-[family-name:var(--font-sora)] font-semibold text-lg mb-5">
                Filter claims
              </h2>

              {/* Status Filter */}
              <div className="mb-5">
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'ACTIVE', 'PAID', 'REJECTED'] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        status === s
                          ? 'bg-[var(--brand-indigo)] text-white'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="mb-5">
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                  Sort
                </label>
                <div className="flex gap-2">
                  {(['NEWEST', 'OLDEST'] as SortOrder[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        sort === s
                          ? 'bg-[var(--brand-indigo-light)] text-[var(--brand-indigo)] border-2 border-[var(--brand-indigo)]'
                          : 'bg-white border-2 border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {s === 'NEWEST' ? 'Newest first' : 'Oldest first'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                  Date range
                </label>
                <div className="flex gap-2">
                  {(['THIS_WEEK', 'THIS_MONTH', 'ALL_TIME'] as DateRange[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDateRange(d)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        dateRange === d
                          ? 'bg-[var(--brand-indigo-light)] text-[var(--brand-indigo)] border-2 border-[var(--brand-indigo)]'
                          : 'bg-white border-2 border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {d === 'THIS_WEEK'
                        ? 'This week'
                        : d === 'THIS_MONTH'
                        ? 'This month'
                        : 'All time'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={onClose}
                className="w-full h-12 bg-[var(--brand-indigo)] text-white rounded-[var(--radius-md)] font-[family-name:var(--font-sora)] font-semibold hover:bg-[var(--brand-indigo-dark)] transition-colors"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Hand-drawn SVG Illustration */}
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        className="mb-6 opacity-50"
      >
        {/* Umbrella */}
        <path
          d="M100 80c30 0 50 15 50 30h-100c0-15 20-30 50-30z"
          fill="var(--brand-indigo)"
          fillOpacity="0.2"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M100 80v60"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M95 135c0 3 2 5 5 5s5-2 5-5"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Rain drops */}
        <g opacity="0.4">
          <path d="M70 50l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M85 45l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M115 45l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M130 50l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 65l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M140 65l-2 8" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Delivery person (simplified) */}
        <circle
          cx="100"
          cy="120"
          r="8"
          fill="var(--brand-indigo)"
          fillOpacity="0.3"
        />
        <path
          d="M100 128v20"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 135l-8 10M100 135l8 10"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 130l-10 5M100 130l10 5"
          stroke="var(--brand-indigo)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Delivery box */}
        <rect
          x="108"
          y="140"
          width="12"
          height="12"
          fill="var(--brand-indigo)"
          fillOpacity="0.2"
          stroke="var(--brand-indigo)"
          strokeWidth="2"
        />
      </svg>

      <h2 className="font-[family-name:var(--font-sora)] font-bold text-[22px] text-[var(--brand-indigo)] mb-3">
        No claims yet
      </h2>

      <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[320px] mb-4">
        When heavy rain, extreme heat, or air quality drops in your delivery zone, your claim starts
        automatically. No forms needed.
      </p>

      {!HAS_ACTIVE_TRIGGERS && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-indigo-light)] text-[var(--brand-indigo)] text-sm">
          <span>Currently: No active triggers in your zone</span>
          <span>✓</span>
        </div>
      )}
    </div>
  )
}

// Trigger Icon Component
function TriggerIcon({ type }: { type: TriggerType }) {
  const config = getTriggerIcon(type)

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden"
      style={{ background: config.bg }}
    >
      {config.icon === 'rain' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M8 14l-1 3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.path
            d="M12 12l-1 4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.path
            d="M16 14l-1 3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </svg>
      )}

      {config.icon === 'heat' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M8 12c0-2 1-3 2-3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.path
            d="M12 8c0-2 1-4 2-4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          <motion.path
            d="M16 12c0-2 1-3 2-3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          />
        </svg>
      )}

      {config.icon === 'pollution' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="10" r="1.5" fill="white" opacity="0.6" />
          <circle cx="12" cy="8" r="2" fill="white" opacity="0.8" />
          <circle cx="16" cy="10" r="1.5" fill="white" opacity="0.6" />
          <circle cx="10" cy="14" r="1" fill="white" opacity="0.4" />
          <circle cx="14" cy="14" r="1" fill="white" opacity="0.4" />
        </svg>
      )}
    </div>
  )
}

// Claim Card
function ClaimCard({
  claim,
  index,
  isExpanded,
  onToggle,
}: {
  claim: Claim
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="relative mb-3 transition-shadow duration-[var(--transition-fast)]"
      style={{
        boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {/* Left Accent Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
        style={{ background: getAccentColor(claim.status) }}
      >
        {claim.status === 'INITIATED' && (
          <motion.div
            className="absolute inset-0 bg-white opacity-30"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Card Body */}
      <div className="ml-1 bg-white rounded-[var(--radius-lg)] p-4">
        {/* Top Row */}
        <div className="flex items-start justify-between mb-3">
          <TriggerIcon type={claim.triggerType} />
          <span className="text-xs text-[var(--text-muted)]">
            {claim.date}, {claim.time}
          </span>
        </div>

        {/* Middle Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[15px] text-[var(--text-primary)] mb-1">
              {claim.triggerName} · {claim.zone}
            </h3>
            <Badge status={claim.status} size="sm" />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          <span
            className="font-[family-name:var(--font-sora)] font-bold text-lg"
            style={{ color: getAmountColor(claim.status) }}
          >
            ₹{claim.amount.toLocaleString('en-IN')}
          </span>
          <button
            onClick={onToggle}
            className="text-xs font-medium text-[var(--brand-indigo)] flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ↳
            </motion.span>
            View details
          </button>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-dashed border-[var(--border-strong)] bg-[var(--brand-indigo-light)]/30 -mx-4 px-4 pb-4 rounded-b-[var(--radius-lg)]">
                <ExpandedClaimDetails claim={claim} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Expanded Claim Details
function ExpandedClaimDetails({ claim }: { claim: Claim }) {
  const [copied, setCopied] = useState(false)

  const copyTransactionId = () => {
    if (claim.details.transactionId) {
      navigator.clipboard.writeText(claim.details.transactionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section 1: What triggered this claim */}
      <div>
        <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--text-primary)] mb-2">
          What triggered this claim
        </h4>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Zone:</span>
            <span className="text-[var(--text-primary)] font-medium">{claim.details.zone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Event time:</span>
            <span className="text-[var(--text-primary)] font-medium">
              {claim.details.eventTime}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">Source:</span>
            <span className="text-[var(--text-primary)] font-medium flex items-center gap-1">
              {claim.details.source}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M4 7l2 2 4-4"
                  stroke="var(--brand-emerald)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="var(--brand-emerald)"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">Confidence:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--brand-emerald-light)] text-[var(--brand-emerald)] text-xs font-medium">
              {claim.details.confidence}% confident
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">
              {claim.triggerType === 'HEAVY_RAIN'
                ? 'Rainfall:'
                : claim.triggerType === 'EXTREME_HEAT'
                ? 'Temperature:'
                : 'AQI:'}
            </span>
            <span className="text-[var(--text-primary)] font-medium">
              {claim.details.metricValue} (threshold: {claim.details.metricThreshold})
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Eligibility checks */}
      {claim.status !== 'REJECTED' && (
        <div>
          <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--text-primary)] mb-2">
            Eligibility checks
          </h4>
          <div className="space-y-2">
            {claim.details.eligibilityChecks.map((check, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {check.passed ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="var(--brand-emerald)" fillOpacity="0.2" />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="var(--brand-emerald)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="var(--brand-red)" fillOpacity="0.2" />
                      <path
                        d="M5 5l6 6M11 5l-6 6"
                        stroke="var(--brand-red)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[var(--text-primary)]">{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Payout calculation (PAID/APPROVED) */}
      {(claim.status === 'PAID' || claim.status === 'APPROVED') && (
        <div>
          <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--text-primary)] mb-2">
            Payout calculation
          </h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Hourly rate:</span>
              <span className="text-[var(--text-primary)]">
                ₹{claim.details.payoutCalculation.hourlyRate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Hours affected:</span>
              <span className="text-[var(--text-primary)]">
                {claim.details.payoutCalculation.hoursAffected} hrs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Severity factor:</span>
              <span className="text-[var(--text-primary)]">
                {claim.details.payoutCalculation.severityFactor}×
              </span>
            </div>
            <div className="border-t border-[var(--border-default)] pt-1.5 mt-1.5 flex justify-between font-semibold">
              <span className="text-[var(--text-primary)]">Total:</span>
              <span className="text-[var(--brand-emerald)]">
                ₹{claim.details.payoutCalculation.total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {claim.status === 'PAID' && claim.details.upiId && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">Paid to:</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  UPI {claim.details.upiId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[var(--text-muted)]">
                  {claim.details.transactionId}
                </span>
                <button
                  onClick={copyTransactionId}
                  className="text-xs text-[var(--brand-indigo)] hover:underline"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section: IN_REVIEW */}
      {claim.status === 'IN_REVIEW' && (
        <div className="p-3 bg-[var(--brand-amber-light)] rounded-lg border border-[var(--brand-amber)]/20">
          <div className="flex items-start gap-2 mb-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[var(--brand-amber)] mt-1"
            />
            <span className="font-medium text-sm text-[var(--text-primary)]">
              Being reviewed by our team
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] ml-4">
            Expected decision: within {claim.details.reviewExpectedTime}
          </p>
        </div>
      )}

      {/* Section: REJECTED */}
      {claim.status === 'REJECTED' && claim.details.rejectionReason && (
        <div>
          <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--text-primary)] mb-2">
            Why wasn't I eligible?
          </h4>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-3">
            {claim.details.rejectionReason}
          </p>
          <button className="text-sm font-medium text-[var(--brand-indigo)] hover:underline">
            Dispute this decision →
          </button>
        </div>
      )}
    </div>
  )
}

// Claims Timeline
function ClaimsTimeline({ claims }: { claims: Claim[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (claims.length === 0) {
    return <EmptyState />
  }

  // Group claims by time period (simplified for demo)
  const thisWeek = claims.filter((c) => c.date.includes('Apr'))
  const earlier: Claim[] = []

  return (
    <div className="px-4 pb-6">
      {thisWeek.length > 0 && (
        <div className="mb-6">
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[13px] text-[var(--text-muted)] uppercase tracking-wide mb-3">
            This Week
          </h3>
          {thisWeek.map((claim, index) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              index={index}
              isExpanded={expandedId === claim.id}
              onToggle={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
            />
          ))}
        </div>
      )}

      {earlier.length > 0 && (
        <div>
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[13px] text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Earlier
          </h3>
          {earlier.map((claim, index) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              index={index + thisWeek.length}
              isExpanded={expandedId === claim.id}
              onToggle={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== MAIN COMPONENT =====
export default function ClaimsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--surface-page)] max-w-[480px] mx-auto pb-20">
      {/* Header */}
      <ClaimsHeader onFilterClick={() => setIsFilterOpen(true)} />

      {/* Claims Timeline or Empty State */}
      <ClaimsTimeline claims={CLAIMS_DATA} />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  )
}
