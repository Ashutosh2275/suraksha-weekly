'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Badge, Button } from '@/components/ui'

// ===== TYPES =====
type ProtectionStatus = 'ACTIVE' | 'EXPIRING' | 'LAPSED'

interface PolicyData {
  workerName: string
  protectionStatus: ProtectionStatus
  coverageEnds: string
  coverageEndsDate: Date
  protectedAmount: number
  zones: string[]
  hasUnreadNotifications: boolean
  initials: string
}

interface TriggerAlert {
  type: 'rain' | 'heat' | 'pollution'
  location: string
  message: string
}

interface LastPayout {
  amount: number
  date: string
  eventType: string
  location: string
}

interface StatsData {
  protectedThisWeek: number
  hoursCovered: number
  claimsThisSeason: number
  claimsApproved: number
  trustScore: number
}

// ===== MOCK DATA =====
const POLICY_DATA: PolicyData = {
  workerName: 'Ravi',
  protectionStatus: 'ACTIVE',
  coverageEnds: 'Sunday, 7 Apr',
  coverageEndsDate: new Date('2026-04-07'),
  protectedAmount: 1500,
  zones: ['Andheri East', 'Bandra'],
  hasUnreadNotifications: true,
  initials: 'RK',
}

const ACTIVE_TRIGGER: TriggerAlert | null = {
  type: 'rain',
  location: 'Andheri East',
  message: 'Heavy rain in Andheri East — you may be eligible for a payout',
}

const STATS: StatsData = {
  protectedThisWeek: 1500,
  hoursCovered: 42,
  claimsThisSeason: 2,
  claimsApproved: 2,
  trustScore: 80,
}

const LAST_PAYOUT: LastPayout | null = {
  amount: 420,
  date: '2 Apr',
  eventType: 'Heavy Rain',
  location: 'Andheri East',
}

// ===== UTILITY FUNCTIONS =====
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const getDaysUntilExpiry = (expiryDate: Date) => {
  const today = new Date()
  const diff = expiryDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const getProtectionStatus = (expiryDate: Date): ProtectionStatus => {
  const days = getDaysUntilExpiry(expiryDate)
  if (days <= 0) return 'LAPSED'
  if (days <= 2) return 'EXPIRING'
  return 'ACTIVE'
}

// ===== COMPONENTS =====

// Top Navigation Bar
function TopNav({ policy }: { policy: PolicyData }) {
  return (
    <nav className="h-14 bg-white border-b border-[var(--border-default)] sticky top-0 z-50">
      <div className="max-w-[480px] mx-auto h-full px-4 flex items-center justify-between">
        {/* Left: Menu */}
        <button className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Center: Wordmark */}
        <h1 className="font-[family-name:var(--font-sora)] font-semibold text-base text-[var(--brand-indigo)]">
          Suraksha Weekly
        </h1>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button className="relative w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3a5 5 0 015 5v4l2 2H3l2-2V8a5 5 0 015-5zM8 16a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {policy.hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--brand-red)] rounded-full" />
            )}
          </button>

          {/* Profile Avatar */}
          <button className="w-8 h-8 rounded-full bg-[var(--brand-indigo)] text-white flex items-center justify-center text-xs font-medium">
            {policy.initials}
          </button>
        </div>
      </div>
    </nav>
  )
}

// Greeting Section
function GreetingSection({ policy }: { policy: PolicyData }) {
  return (
    <div className="px-4 pt-5 pb-4">
      <h2 className="font-[family-name:var(--font-sora)] font-semibold text-[22px] text-[var(--text-primary)] mb-1">
        {getGreeting()}, {policy.workerName} 👋
      </h2>
      <p className="text-sm text-[var(--text-muted)]">
        {getCurrentDate()}
      </p>
    </div>
  )
}

// Hero Status Card
function HeroStatusCard({ policy }: { policy: PolicyData }) {
  const daysRemaining = getDaysUntilExpiry(policy.coverageEndsDate)
  const isExpiring = daysRemaining > 0 && daysRemaining <= 2

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mx-4 mb-5 rounded-[var(--radius-xl)] overflow-hidden relative"
      style={{
        background: '#0D1B3E',
      }}
    >
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 30%, rgba(27,79,204,0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 70%, rgba(27,79,204,0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 30%, rgba(27,79,204,0.4) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Left: Shield Icon */}
          <div className="flex-shrink-0">
            {policy.protectionStatus === 'ACTIVE' && (
              <motion.div
                animate={{
                  filter: [
                    'drop-shadow(0 0 8px rgba(0,200,150,0.6))',
                    'drop-shadow(0 0 16px rgba(0,200,150,0.8))',
                    'drop-shadow(0 0 8px rgba(0,200,150,0.6))',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ShieldIcon color="var(--brand-emerald)" size={48} />
              </motion.div>
            )}
            {policy.protectionStatus === 'EXPIRING' && (
              <motion.div
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ShieldIcon color="var(--brand-amber)" size={48} />
              </motion.div>
            )}
            {policy.protectionStatus === 'LAPSED' && (
              <ShieldIcon color="#8B96AF" size={48} />
            )}
          </div>

          {/* Right: Status Text */}
          <div className="flex-1 ml-4">
            <h3 className="font-[family-name:var(--font-sora)] font-semibold text-lg text-white mb-1">
              {policy.protectionStatus === 'ACTIVE' && "You're protected"}
              {policy.protectionStatus === 'EXPIRING' && 'Coverage expiring soon'}
              {policy.protectionStatus === 'LAPSED' && 'Coverage has lapsed'}
            </h3>
            <p className="text-[13px] text-white/60 mb-0.5">
              Until {policy.coverageEnds}
            </p>
            <p className="text-[13px] text-white/60">
              Up to ₹{policy.protectedAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Bottom Row: Zones + Renew Button */}
        <div className="flex items-center justify-between">
          {/* Zone Pills */}
          <div className="flex flex-wrap gap-1.5">
            {policy.zones.map((zone) => (
              <span
                key={zone}
                className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs"
              >
                {zone}
              </span>
            ))}
          </div>

          {/* Renew Button */}
          {isExpiring && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 rounded-full bg-[var(--brand-amber)] text-[var(--text-primary)] font-[family-name:var(--font-sora)] font-semibold text-[13px]"
            >
              Renew
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Shield Icon Component
function ShieldIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4L6 12v12c0 11.25 7.8 21.75 18 24 10.2-2.25 18-12.75 18-24V12L24 4z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 24l5 5 11-11"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Active Alert Banner
function ActiveAlertBanner({ alert }: { alert: TriggerAlert | null }) {
  if (!alert) return null

  const getIcon = () => {
    switch (alert.type) {
      case 'rain':
        return (
          <motion.svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path
              d="M8 14l-2 4M12 12l-2 6M16 14l-2 4"
              stroke="var(--brand-amber)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 8a4 4 0 00-8 0c-2 0-3 2-3 4s1 4 3 4h10c2 0 3-2 3-4s-1-4-3-4a4 4 0 00-2-4z"
              fill="var(--brand-amber)"
              fillOpacity="0.2"
              stroke="var(--brand-amber)"
              strokeWidth="1.5"
            />
          </motion.svg>
        )
      case 'heat':
        return '🌡'
      case 'pollution':
        return '🏭'
    }
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="mx-4 mb-4 rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FEF6E4, #FEF3D7)',
        borderLeft: '4px solid var(--brand-amber)',
      }}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">{getIcon()}</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {alert.message}
          </p>
        </div>
        <button className="flex-shrink-0 font-[family-name:var(--font-sora)] font-semibold text-sm text-[var(--brand-indigo)] flex items-center gap-0.5 hover:gap-1 transition-all">
          Check
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// Stats Grid
function StatsGrid({ stats }: { stats: StatsData }) {
  const statCards = [
    {
      id: 'protected',
      icon: '🛡',
      value: `₹${stats.protectedThisWeek.toLocaleString('en-IN')}`,
      label: 'Protected this week',
      color: 'var(--brand-indigo)',
      delay: 0,
    },
    {
      id: 'hours',
      icon: '⏰',
      value: `${stats.hoursCovered} hrs`,
      label: 'Hours covered',
      color: 'var(--text-primary)',
      delay: 0.08,
    },
    {
      id: 'claims',
      icon: '✓',
      value: `${stats.claimsApproved} approved`,
      label: 'Claims this season',
      color: stats.claimsApproved > 0 ? 'var(--brand-emerald)' : 'var(--text-primary)',
      delay: 0.16,
    },
    {
      id: 'trust',
      icon: '⭐',
      value: `${stats.trustScore}/100`,
      label: 'Trust score',
      color: 'var(--text-primary)',
      delay: 0.24,
      hasRing: true,
    },
  ]

  return (
    <div className="px-4 mb-5">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: card.delay, duration: 0.3 }}
            className="bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              {card.hasRing && (
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="var(--border-default)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <motion.circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="var(--brand-indigo)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - stats.trustScore / 100) }}
                      transition={{ delay: card.delay + 0.2, duration: 1 }}
                    />
                  </svg>
                </div>
              )}
            </div>
            <p
              className="font-[family-name:var(--font-sora)] font-bold text-[22px] mb-1"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Last Payout Card
function LastPayoutCard({ payout }: { payout: LastPayout | null }) {
  return (
    <div className="px-4 mb-5">
      <h3 className="font-[family-name:var(--font-sora)] font-semibold text-base text-[var(--text-primary)] mb-3">
        Last payout
      </h3>

      {payout ? (
        <div className="bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-3">
            {/* Emerald Circle with ₹ */}
            <div className="w-10 h-10 rounded-full bg-[var(--brand-emerald-light)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--brand-emerald)] font-bold">₹</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-sora)] font-semibold text-[var(--text-primary)] mb-0.5">
                ₹{payout.amount.toLocaleString('en-IN')} · {payout.eventType}
              </p>
              <p className="text-[13px] text-[var(--text-muted)]">
                {payout.date} · {payout.location}
              </p>
            </div>

            {/* Badge */}
            <Badge status="PAID" size="sm" />
          </div>

          <button className="text-sm font-medium text-[var(--brand-indigo)] hover:underline">
            View all payouts →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-sm)] text-center">
          {/* Simple Cloud SVG */}
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            className="mx-auto mb-4 opacity-30"
          >
            <path
              d="M48 36c4 0 8-4 8-8s-4-8-8-8c0-8-6-14-14-14-6 0-11 4-13 9-5 1-9 5-9 10 0 6 5 11 11 11h25z"
              fill="var(--text-muted)"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="28" cy="26" r="1.5" fill="var(--text-primary)" />
            <circle cx="36" cy="26" r="1.5" fill="var(--text-primary)" />
            <path d="M28 32c0 2 2 4 4 4s4-2 4-4" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <h4 className="font-[family-name:var(--font-sora)] font-semibold text-base text-[var(--text-muted)] mb-2">
            No payouts yet
          </h4>
          <p className="text-[13px] text-[var(--text-muted)] max-w-[280px] mx-auto">
            We hope it stays that way! But if disruption hits, we've got you.
          </p>
        </div>
      )}
    </div>
  )
}

// Quick Actions Row
function QuickActionsRow() {
  const actions = [
    { id: 'policy', icon: '📋', label: 'My Policy' },
    { id: 'renew', icon: '🔄', label: 'Renew' },
    { id: 'support', icon: '💬', label: 'Support' },
  ]

  return (
    <div className="px-4 mb-8">
      <div className="flex items-center justify-center gap-8">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', damping: 15, stiffness: 400 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-white shadow-[var(--shadow-sm)] flex items-center justify-center text-2xl">
              {action.icon}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Bottom Navigation Bar
function BottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'claims', label: 'Claims', icon: '📋' },
    { id: 'payouts', label: 'Payouts', icon: '💰' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border-default)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="h-16 max-w-[480px] mx-auto grid grid-cols-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5"
            >
              {/* Active Indicator Dot */}
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="absolute top-2 w-1 h-1 rounded-full bg-[var(--brand-indigo)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <motion.span
                animate={{ scale: isActive ? 1 : 0.9 }}
                transition={{ type: 'spring', damping: 15 }}
                className="text-xl"
                style={{ opacity: isActive ? 1 : 0.5 }}
              >
                {tab.icon}
              </motion.span>
              <span
                className="text-[11px] font-medium"
                style={{
                  color: isActive ? 'var(--brand-indigo)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===== MAIN COMPONENT =====
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('home')
  const router = useRouter()

  // Update protection status dynamically
  const [policy, setPolicy] = useState(POLICY_DATA)
  useEffect(() => {
    const status = getProtectionStatus(policy.coverageEndsDate)
    if (status !== policy.protectionStatus) {
      setPolicy({ ...policy, protectionStatus: status })
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Top Navigation */}
      <TopNav policy={policy} />

      {/* Main Content - Single Column, Max Width 480px */}
      <div className="max-w-[480px] mx-auto pb-20 lg:pb-8">
        {/* Greeting */}
        <GreetingSection policy={policy} />

        {/* Hero Status Card */}
        <HeroStatusCard policy={policy} />

        {/* Active Alert Banner */}
        <AnimatePresence>
          <ActiveAlertBanner alert={ACTIVE_TRIGGER} />
        </AnimatePresence>

        {/* Stats Grid */}
        <StatsGrid stats={STATS} />

        {/* Last Payout */}
        <LastPayoutCard payout={LAST_PAYOUT} />

        {/* Quick Actions */}
        <QuickActionsRow />
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}
