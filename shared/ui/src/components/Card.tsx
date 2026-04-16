'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import Link from 'next/link'

export interface CardProps {
  variant?: 'default' | 'elevated' | 'glass' | 'colored'
  colorScheme?: 'indigo' | 'amber' | 'emerald' | 'red'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
  href?: string
  onClick?: () => void
  children: ReactNode
  className?: string
}

export function Card({
  variant = 'default',
  colorScheme = 'indigo',
  padding = 'md',
  clickable = false,
  href,
  onClick,
  children,
  className = '',
}: CardProps) {
  const baseStyles = 'rounded-lg transition-all'

  const variantStyles = {
    default: 'bg-surface-card shadow-md border border-border-default',
    elevated: 'bg-surface-card shadow-lg border-0',
    glass: 'bg-white/70 backdrop-blur-md border border-white/60 shadow-md',
    colored: '',
  }

  const coloredStyles = {
    indigo: 'bg-brand-indigo-light border-2 border-brand-indigo/20',
    amber: 'bg-brand-amber-light border-2 border-brand-amber/20',
    emerald: 'bg-brand-emerald-light border-2 border-brand-emerald/20',
    red: 'bg-brand-red-light border-2 border-brand-red/20',
  }

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const isInteractive = clickable || href || onClick

  const cardContent = (
    <motion.div
      className={`
        ${baseStyles}
        ${variant === 'colored' ? coloredStyles[colorScheme] : variantStyles[variant]}
        ${paddingStyles[padding]}
        ${isInteractive ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={isInteractive ? { y: -2, boxShadow: '0 12px 40px rgba(13, 27, 62, 0.14)' } : {}}
      whileTap={isInteractive ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}
