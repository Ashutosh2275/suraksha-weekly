'use client'

import { motion } from 'framer-motion'

export type BadgeStatus = 
  | 'ACTIVE' 
  | 'LAPSED' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'PAID' 
  | 'REJECTED' 
  | 'INITIATED' 
  | 'PENDING'

export interface BadgeProps {
  status: BadgeStatus
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const statusConfig: Record<BadgeStatus, { bg: string; text: string; border: string; shouldPulse: boolean }> = {
  ACTIVE: {
    bg: 'bg-brand-emerald-light',
    text: 'text-brand-emerald',
    border: 'border-brand-emerald/20',
    shouldPulse: false,
  },
  PAID: {
    bg: 'bg-brand-emerald-light',
    text: 'text-brand-emerald',
    border: 'border-brand-emerald/20',
    shouldPulse: false,
  },
  IN_REVIEW: {
    bg: 'bg-brand-amber-light',
    text: 'text-text-amber',
    border: 'border-brand-amber/20',
    shouldPulse: true,
  },
  PENDING: {
    bg: 'bg-brand-amber-light',
    text: 'text-text-amber',
    border: 'border-brand-amber/20',
    shouldPulse: false,
  },
  INITIATED: {
    bg: 'bg-brand-amber-light',
    text: 'text-text-amber',
    border: 'border-brand-amber/20',
    shouldPulse: true,
  },
  APPROVED: {
    bg: 'bg-brand-indigo-light',
    text: 'text-brand-indigo',
    border: 'border-brand-indigo/20',
    shouldPulse: false,
  },
  REJECTED: {
    bg: 'bg-brand-red-light',
    text: 'text-brand-red',
    border: 'border-brand-red/20',
    shouldPulse: false,
  },
  LAPSED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    shouldPulse: false,
  },
}

export function Badge({ status, size = 'md', dot = false, className = '' }: BadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  const showPulse = dot && config.shouldPulse

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium font-display rounded-full border
        ${config.bg} ${config.text} ${config.border}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {showPulse && (
            <motion.span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.bg.replace('-light', '')}`}
              animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg.replace('-light', '')}`} />
        </span>
      )}
      {status.replace(/_/g, ' ')}
    </span>
  )
}
