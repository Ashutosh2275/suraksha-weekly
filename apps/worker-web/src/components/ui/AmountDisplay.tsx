'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

export interface AmountDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'hero'
  showRupee?: boolean
  animate?: boolean
  className?: string
}

function formatIndianNumber(num: number): string {
  const [integer, decimal] = num.toFixed(2).split('.')
  const lastThree = integer.slice(-3)
  const otherDigits = integer.slice(0, -3)
  const formatted = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherDigits ? ',' : '') + lastThree
  return decimal ? `${formatted}.${decimal}` : formatted
}

export function AmountDisplay({ 
  amount, 
  size = 'md', 
  showRupee = true,
  animate: shouldAnimate = false,
  className = '' 
}: AmountDisplayProps) {
  const motionAmount = useMotionValue(shouldAnimate ? 0 : amount)
  const rounded = useTransform(motionAmount, latest => Math.round(latest))

  useEffect(() => {
    if (shouldAnimate) {
      const controls = animate(motionAmount, amount, {
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1],
      })
      return controls.stop
    } else {
      motionAmount.set(amount)
    }
  }, [amount, shouldAnimate, motionAmount])

  const sizeStyles = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    hero: 'text-hero',
  }

  const rupeeSizeStyles = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    hero: 'text-4xl',
  }

  return (
    <div className={`inline-flex items-baseline gap-1 font-display font-bold ${className}`}>
      {showRupee && (
        <span className={`text-text-amber ${rupeeSizeStyles[size]}`}>
          ₹
        </span>
      )}
      <motion.span className={`${sizeStyles[size]} ${size === 'hero' ? 'text-brand-indigo' : ''}`}>
        {shouldAnimate ? (
          <motion.span>
            {useTransform(rounded, latest => formatIndianNumber(latest as number))}
          </motion.span>
        ) : (
          formatIndianNumber(amount)
        )}
      </motion.span>
    </div>
  )
}
