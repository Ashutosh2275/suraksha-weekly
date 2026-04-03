'use client'

import { motion } from 'framer-motion'
import { ReactNode, InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helper?: string
  prefix?: ReactNode
  suffix?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, suffix, size = 'md', className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-14 px-5 text-lg',
    }

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium font-display text-text-secondary">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-text-muted pointer-events-none">
              {prefix}
            </div>
          )}

          <motion.input
            ref={ref}
            className={`
              w-full bg-surface-card border rounded-md font-body
              transition-all duration-150
              placeholder:text-text-muted
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${prefix ? 'pl-10' : ''}
              ${suffix ? 'pr-10' : ''}
              ${sizeStyles[size]}
              ${
                error
                  ? 'border-brand-red focus:border-brand-red focus:shadow-[0_0_0_3px_rgba(229,53,53,0.12)]'
                  : 'border-border-default focus:border-brand-indigo focus:shadow-[0_0_0_3px_rgba(27,79,204,0.12)]'
              }
              ${className}
            `}
            style={{ fontSize: Math.max(parseInt(sizeStyles[size].match(/text-(\w+)/)?.[1] === 'sm' ? '14' : sizeStyles[size].match(/text-(\w+)/)?.[1] === 'lg' ? '18' : '16'), 16) }}
            animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            {...props}
          />

          {suffix && (
            <div className="absolute right-3 text-text-muted pointer-events-none">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 text-sm text-brand-red"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </motion.div>
        )}

        {helper && !error && (
          <p className="text-sm text-text-muted">{helper}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
