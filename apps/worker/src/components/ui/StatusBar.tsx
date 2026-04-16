'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export interface StatusBarProps {
  start: Date
  end: Date
  colorScheme?: 'indigo' | 'amber' | 'emerald'
  className?: string
}

function getDaysRemaining(end: Date): number {
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

function getProgress(start: Date, end: Date): number {
  const now = new Date()
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

export function StatusBar({ 
  start, 
  end, 
  colorScheme = 'indigo',
  className = '' 
}: StatusBarProps) {
  const [progress, setProgress] = useState(0)
  const daysRemaining = getDaysRemaining(end)
  const actualProgress = getProgress(start, end)
  const isNearExpiry = (100 - actualProgress) < 20

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(actualProgress)
    }, 100)
    return () => clearTimeout(timer)
  }, [actualProgress])

  const colorStyles = {
    indigo: isNearExpiry 
      ? 'from-brand-amber to-brand-amber-dark' 
      : 'from-brand-indigo to-brand-indigo-dark',
    amber: 'from-brand-amber to-brand-amber-dark',
    emerald: 'from-brand-emerald to-brand-emerald/80',
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium font-display text-text-secondary">
          Coverage Period
        </span>
        <span className={`text-sm font-semibold font-display ${isNearExpiry ? 'text-text-amber' : 'text-text-brand'}`}>
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        </span>
      </div>

      <div className="relative h-2 bg-border-default rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r rounded-full ${colorStyles[colorScheme]}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 15,
            duration: 0.8 
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted font-body">
          {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-xs text-text-muted font-body">
          {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
