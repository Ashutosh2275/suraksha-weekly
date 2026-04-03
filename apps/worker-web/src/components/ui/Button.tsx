'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  children,
  className = '',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-display font-semibold transition-all duration-100 focus:outline-none focus:ring-4 focus:ring-brand-indigo/20 relative overflow-hidden'

  const variantStyles = {
    primary: 'bg-brand-indigo text-text-inverse shadow-brand hover:bg-brand-indigo-dark disabled:bg-brand-indigo',
    secondary: 'border-2 border-brand-indigo text-text-brand bg-transparent hover:bg-brand-indigo hover:text-text-inverse disabled:border-brand-indigo disabled:text-text-brand disabled:bg-transparent',
    ghost: 'text-text-secondary bg-transparent hover:bg-surface-subtle hover:text-text-primary disabled:bg-transparent disabled:text-text-secondary',
    danger: 'bg-brand-red text-text-inverse shadow-md hover:bg-brand-red/90 disabled:bg-brand-red',
    amber: 'bg-brand-amber text-text-primary shadow-amber hover:bg-brand-amber-dark disabled:bg-brand-amber',
  }

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm rounded-sm',
    md: 'h-10 px-5 text-base rounded-md',
    lg: 'h-12 px-6 text-lg rounded-lg',
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={!isDisabled ? { y: -1, boxShadow: variant === 'primary' ? '0 6px 32px rgba(27,79,204,0.35)' : variant === 'amber' ? '0 6px 28px rgba(245,166,35,0.40)' : undefined } : {}}
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      transition={{ duration: 0.1 }}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </motion.div>
      )}

      <motion.div
        className="flex items-center gap-2"
        animate={loading ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span>{icon}</span>}
      </motion.div>
    </motion.button>
  )
}
