'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui'

// ===== TYPES =====
type PolicyStatus = 'ACTIVE' | 'EXPIRING' | 'LAPSED'
type TriggerStatus = 'ACTIVE' | 'WAITING_PERIOD'

interface PolicyData {
  id: string
  status: PolicyStatus
  validUntil: string
  coveragePeriod: string
  premiumPaid: number
  coverageLimit: number
  zones: string[]
  daysRemaining: number
  nextWeekPremium: number
}

interface Trigger {
  id: string
  name: string
  icon: 'rain' | 'heat' | 'pollution'
  color: string
  threshold: string
  status: TriggerStatus
  waitingPeriodRemaining?: number
}

interface PremiumFactor {
  name: string
  icon: string
  amount: number
  direction: 'up' | 'down'
}

interface Exclusion {
  name: string
  explanation: string
}

// ===== MOCK DATA =====
const POLICY: PolicyData = {
  id: 'POL-SW-2026-042301',
  status: 'ACTIVE',
  validUntil: 'Sunday, 7 April 2026',
  coveragePeriod: '1 Apr – 7 Apr 2026',
  premiumPaid: 67,
  coverageLimit: 1500,
  zones: ['Andheri East', 'Bandra', 'Worli'],
  daysRemaining: 3,
  nextWeekPremium: 67,
}

const TRIGGERS: Trigger[] = [
  {
    id: 'heavy-rain',
    name: 'Heavy Rain',
    icon: 'rain',
    color: '#3B82F6',
    threshold: 'Rainfall above 15mm/hour for 30+ minutes',
    status: 'ACTIVE',
  },
  {
    id: 'extreme-heat',
    name: 'Extreme Heat',
    icon: 'heat',
    color: '#F97316',
    threshold: 'Temperature above 40°C for 2+ hours',
    status: 'ACTIVE',
  },
  {
    id: 'severe-pollution',
    name: 'Severe Pollution',
    icon: 'pollution',
    color: '#6B7280',
    threshold: 'AQI above 300 for 3+ hours',
    status: 'WAITING_PERIOD',
    waitingPeriodRemaining: 18,
  },
]

const PREMIUM_FACTORS: PremiumFactor[] = [
  { name: 'Mumbai · Monsoon Zone', icon: '🌧', amount: 18, direction: 'up' },
  { name: 'Metro city exposure', icon: '🏙', amount: 8, direction: 'up' },
  { name: 'Trust score bonus', icon: '⭐', amount: 8, direction: 'down' },
]

const EXCLUSIONS: Exclusion[] = [
  {
    name: 'Health or medical issues',
    explanation:
      'This covers income loss, not health. Please use health insurance for medical needs.',
  },
  {
    name: 'Accidents or vehicle damage',
    explanation: 'Vehicle insurance covers these. This policy focuses on weather disruptions.',
  },
  {
    name: 'Self-initiated breaks',
    explanation: 'Coverage only applies when weather prevents deliveries, not personal time off.',
  },
  {
    name: 'Events outside coverage zones',
    explanation: 'Claims require you to be actively delivering in a covered zone.',
  },
]

// ===== UTILITY FUNCTIONS =====
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toFixed(2)}`
}

// ===== COMPONENTS =====

// Header
function PolicyHeader({ onShare }: { onShare: () => void }) {
  const router = useRouter()

  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--border-default)] bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 16l-6-6 6-6"
              stroke="var(--text-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="font-[family-name:var(--font-sora)] font-semibold text-lg text-[var(--text-primary)]">
          My Policy
        </h1>
      </div>

      <button
        onClick={onShare}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M14 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2h2M9 15h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

// Policy Certificate Card
function PolicyCertificateCard({ policy }: { policy: PolicyData }) {
  const [copiedId, setCopiedId] = useState(false)

  const copyPolicyId = async () => {
    const success = await copyToClipboard(policy.id)
    if (success) {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  return (
    <div className="mx-4 my-5">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] overflow-hidden relative"
      >
        {/* Geometric Pattern Background */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(27,79,204,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top Accent Bar */}
        <div
          className="h-1 w-full"
          style={{
            background: 'linear-gradient(90deg, var(--brand-indigo) 0%, var(--brand-indigo-dark) 100%)',
          }}
        />

        <div className="relative p-5">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Shield Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 6v6c0 5.25 3.6 10.2 8 11.4 4.4-1.2 8-6.15 8-11.4V6l-8-4z"
                  fill="var(--brand-indigo)"
                  fillOpacity="0.2"
                  stroke="var(--brand-indigo)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 12l2 2 4-4"
                  stroke="var(--brand-indigo)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--text-primary)]">
                Suraksha Weekly
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[var(--text-muted)]">
                {policy.id}
              </span>
              <button
                onClick={copyPolicyId}
                className="w-6 h-6 flex items-center justify-center hover:bg-[var(--surface-subtle)] rounded transition-colors"
              >
                {copiedId ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7l3 3 5-6"
                      stroke="var(--brand-emerald)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="4"
                      y="4"
                      width="8"
                      height="8"
                      rx="1"
                      stroke="var(--text-muted)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M2 10V3a1 1 0 011-1h7"
                      stroke="var(--text-muted)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Status Section */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge status="ACTIVE" size="md" dot />
            </div>
            <p className="text-sm text-[var(--text-muted)]">Valid until {policy.validUntil}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-default)]">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Coverage period</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {policy.coveragePeriod}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Premium paid</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatCurrency(policy.premiumPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Coverage limit</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Up to ₹{policy.coverageLimit.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Zones</p>
              <div className="flex flex-wrap gap-1">
                {policy.zones.slice(0, 2).map((zone) => (
                  <span
                    key={zone}
                    className="inline-flex px-2 py-0.5 rounded-full bg-[var(--brand-indigo-light)] text-[var(--brand-indigo)] text-xs"
                  >
                    {zone}
                  </span>
                ))}
                {policy.zones.length > 2 && (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)] text-xs">
                    +{policy.zones.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Trigger Icon Component
function TriggerIcon({ type, color }: { type: 'rain' | 'heat' | 'pollution'; color: string }) {
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center"
      style={{ background: color }}
    >
      {type === 'rain' && (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <motion.path
            d="M10 16l-1.5 4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.path
            d="M14 14l-1.5 5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.path
            d="M18 16l-1.5 4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
        </svg>
      )}

      {type === 'heat' && (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          {/* Thermometer */}
          <rect x="11" y="6" width="6" height="14" rx="3" fill="white" fillOpacity="0.3" />
          <motion.rect
            x="12"
            y="14"
            width="4"
            height="6"
            rx="2"
            fill="white"
            initial={{ height: 0, y: 20 }}
            animate={{ height: 6, y: 14 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          />
          <circle cx="14" cy="21" r="3" fill="white" />
        </svg>
      )}

      {type === 'pollution' && (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          {/* Cloud with particles */}
          <ellipse cx="14" cy="12" rx="8" ry="5" fill="white" fillOpacity="0.3" />
          <motion.circle
            cx="10"
            cy="16"
            r="1.5"
            fill="white"
            animate={{ y: [0, -2, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx="14"
            cy="18"
            r="1.5"
            fill="white"
            animate={{ y: [0, -2, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          <motion.circle
            cx="18"
            cy="16"
            r="1.5"
            fill="white"
            animate={{ y: [0, -2, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          />
        </svg>
      )}
    </div>
  )
}

// Trigger Card
function TriggerCard({ trigger }: { trigger: Trigger }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-4 flex items-start gap-4 transition-all"
    >
      <TriggerIcon type={trigger.icon} color={trigger.color} />

      <div className="flex-1">
        <h4 className="font-[family-name:var(--font-sora)] font-semibold text-[15px] text-[var(--text-primary)] mb-1">
          {trigger.name}
        </h4>
        <p className="text-[13px] text-[var(--text-muted)] mb-2 leading-relaxed">
          {trigger.threshold}
        </p>

        {trigger.status === 'ACTIVE' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-emerald-light)] text-[var(--brand-emerald)] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-emerald)]" />
            Active coverage
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-amber-light)] text-[var(--text-amber)] text-xs font-medium">
            Waiting period: {trigger.waitingPeriodRemaining}h remaining
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Coverage Details Section
function CoverageDetailsSection({ triggers }: { triggers: Trigger[] }) {
  return (
    <div className="px-4 mb-6">
      <h2 className="font-[family-name:var(--font-sora)] font-semibold text-lg text-[var(--text-primary)] mb-4">
        What's covered
      </h2>
      <div className="space-y-3">
        {triggers.map((trigger) => (
          <TriggerCard key={trigger.id} trigger={trigger} />
        ))}
      </div>
    </div>
  )
}

// Exclusions Section
function ExclusionsSection({ exclusions }: { exclusions: Exclusion[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="px-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <span>Exclusions</span>
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-[var(--surface-subtle)] rounded-[var(--radius-lg)] p-4 space-y-3">
              {exclusions.map((exclusion, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="var(--brand-red)" fillOpacity="0.1" />
                      <path
                        d="M5 5l6 6M11 5l-6 6"
                        stroke="var(--brand-red)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
                      {exclusion.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {exclusion.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Premium Breakdown Section
function PremiumBreakdownSection({ factors, total }: { factors: PremiumFactor[]; total: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="px-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--brand-indigo)] transition-colors"
      >
        <span>Why {formatCurrency(total)} this week?</span>
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] p-4 space-y-2.5">
              {factors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{factor.icon}</span>
                    <span className="text-sm text-[var(--text-primary)]">{factor.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-medium ${
                        factor.direction === 'up'
                          ? 'text-[var(--brand-red)]'
                          : 'text-[var(--brand-emerald)]'
                      }`}
                    >
                      {factor.direction === 'up' ? '+' : '-'} {formatCurrency(factor.amount)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {factor.direction === 'up' ? '↑' : '↓'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="border-t border-[var(--border-default)] pt-2.5 flex items-center justify-between font-semibold">
                <span className="text-sm text-[var(--text-primary)]">Total</span>
                <span className="text-base text-[var(--brand-indigo)]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Status Bar Component (simple version)
function StatusBar({ daysTotal, daysRemaining }: { daysTotal: number; daysRemaining: number }) {
  const percentage = ((daysTotal - daysRemaining) / daysTotal) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Coverage period</span>
        <span className="text-[var(--text-primary)] font-medium">
          {daysRemaining} days remaining
        </span>
      </div>
      <div className="h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              daysRemaining <= 2
                ? 'var(--brand-amber)'
                : 'linear-gradient(90deg, var(--brand-indigo) 0%, var(--brand-indigo-dark) 100%)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>
    </div>
  )
}

// Renewal Section
function RenewalSection({ policy, onRenew }: { policy: PolicyData; onRenew: () => void }) {
  const [autoRenew, setAutoRenew] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleToggle = () => {
    setAutoRenew(!autoRenew)
    if (!autoRenew) {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 3000)
    }
  }

  return (
    <div className="px-4 mb-6">
      <div
        className="bg-[var(--brand-amber-light)] border-l-4 border-[var(--brand-amber)] rounded-[var(--radius-lg)] p-4"
      >
        <h3 className="font-[family-name:var(--font-sora)] font-semibold text-base text-[var(--text-primary)] mb-3">
          Coverage ends in {policy.daysRemaining} days
        </h3>

        <StatusBar daysTotal={7} daysRemaining={policy.daysRemaining} />

        <div className="mt-4 mb-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Next week's premium:</p>
          <p className="text-lg font-[family-name:var(--font-sora)] font-bold text-[var(--text-primary)]">
            {formatCurrency(policy.nextWeekPremium)}
          </p>
        </div>

        <button
          onClick={onRenew}
          className="w-full h-12 bg-[var(--brand-amber)] text-[var(--text-primary)] rounded-[var(--radius-md)] font-[family-name:var(--font-sora)] font-semibold hover:bg-[var(--brand-amber-dark)] transition-colors mb-4"
        >
          Renew for next week
        </button>

        {/* Auto-renew Toggle */}
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-[var(--text-primary)] block mb-0.5">
                Auto-renew weekly
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                We'll renew automatically each week. Turn off anytime.
              </p>
            </div>

            {/* iOS-style Toggle */}
            <button
              onClick={handleToggle}
              className={`flex-shrink-0 w-12 h-7 rounded-full transition-colors relative ${
                autoRenew ? 'bg-[var(--brand-indigo)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                animate={{ x: autoRenew ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-12 left-0 right-0 bg-[var(--surface-dark)] text-white text-xs px-3 py-2 rounded-lg"
              >
                You'll be notified 24h before each renewal
                <div
                  className="absolute -bottom-1 left-4 w-2 h-2 bg-[var(--surface-dark)] rotate-45"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Renewal Modal
function RenewalModal({
  isOpen,
  onClose,
  policy,
}: {
  isOpen: boolean
  onClose: () => void
  policy: PolicyData
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  const handleConfirm = async () => {
    setStatus('loading')
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setStatus('success')
    setTimeout(() => {
      onClose()
      setStatus('idle')
    }, 2000)
  }

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
            className="fixed inset-0 bg-[rgba(13,27,62,0.4)] backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[var(--radius-2xl)] z-50 max-w-[480px] mx-auto max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="pt-3 pb-4 flex justify-center">
              <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full" />
            </div>

            <div className="px-5 pb-6">
              {status === 'success' ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-emerald-light)] flex items-center justify-center"
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path
                        d="M9 16l5 5 9-10"
                        stroke="var(--brand-emerald)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                  <h2 className="font-[family-name:var(--font-sora)] font-bold text-xl text-[var(--text-primary)] mb-2">
                    Renewed!
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Coverage until 14 Apr
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-[family-name:var(--font-sora)] font-bold text-xl text-[var(--text-primary)] mb-4">
                    Confirm renewal
                  </h2>

                  {/* Mini Policy Summary */}
                  <div className="bg-[var(--surface-subtle)] rounded-[var(--radius-lg)] p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[var(--text-muted)]">Coverage period</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {policy.coveragePeriod}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Coverage limit</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Up to ₹{policy.coverageLimit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    {formatCurrency(policy.nextWeekPremium)} will be charged to your saved payment
                    method
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={status === 'loading'}
                      className="flex-1 h-12 bg-white border-2 border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)] font-[family-name:var(--font-sora)] font-semibold hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={status === 'loading'}
                      className="flex-1 h-12 bg-[var(--brand-indigo)] text-white rounded-[var(--radius-md)] font-[family-name:var(--font-sora)] font-semibold hover:bg-[var(--brand-indigo-dark)] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {status === 'loading' ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Processing...
                        </>
                      ) : (
                        `Confirm · ${formatCurrency(policy.nextWeekPremium)}`
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ===== MAIN COMPONENT =====
export default function PolicyPage() {
  const [shareTooltip, setShareTooltip] = useState(false)
  const [renewalModalOpen, setRenewalModalOpen] = useState(false)

  const handleShare = async () => {
    const summary = `Suraksha Weekly Policy\nID: ${POLICY.id}\nValid until: ${POLICY.validUntil}\nCoverage: Up to ₹${POLICY.coverageLimit.toLocaleString('en-IN')}`
    const success = await copyToClipboard(summary)
    if (success) {
      setShareTooltip(true)
      setTimeout(() => setShareTooltip(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] max-w-[480px] mx-auto pb-20 relative">
      {/* Header */}
      <PolicyHeader onShare={handleShare} />

      {/* Share Tooltip */}
      <AnimatePresence>
        {shareTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-4 bg-[var(--surface-dark)] text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20"
          >
            Copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Policy Certificate Card */}
      <PolicyCertificateCard policy={POLICY} />

      {/* Coverage Details */}
      <CoverageDetailsSection triggers={TRIGGERS} />

      {/* Exclusions */}
      <ExclusionsSection exclusions={EXCLUSIONS} />

      {/* Premium Breakdown */}
      <PremiumBreakdownSection factors={PREMIUM_FACTORS} total={POLICY.premiumPaid} />

      {/* Renewal Section */}
      <RenewalSection policy={POLICY} onRenew={() => setRenewalModalOpen(true)} />

      {/* Renewal Modal */}
      <RenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        policy={POLICY}
      />
    </div>
  )
}
