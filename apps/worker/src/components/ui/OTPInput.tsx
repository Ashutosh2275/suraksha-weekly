'use client'

import { motion } from 'framer-motion'
import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'

export interface OTPInputProps {
  length?: number
  value?: string
  onChange?: (otp: string) => void
  error?: boolean
  onComplete?: (otp: string) => void
}

export function OTPInput({ 
  length = 6, 
  value = '', 
  onChange, 
  error = false,
  onComplete 
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (value) {
      setOtp(value.split('').slice(0, length).concat(Array(length).fill('')).slice(0, length))
    }
  }, [value, length])

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return

    const newOtp = [...otp]
    newOtp[index] = digit.slice(-1)
    setOtp(newOtp)

    const otpString = newOtp.join('')
    onChange?.(otpString)

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (otpString.length === length && newOtp.every(d => d !== '')) {
      onComplete?.(otpString)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newOtp = [...otp]
      
      if (otp[index]) {
        newOtp[index] = ''
        setOtp(newOtp)
        onChange?.(newOtp.join(''))
      } else if (index > 0) {
        newOtp[index - 1] = ''
        setOtp(newOtp)
        onChange?.(newOtp.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length)
    const newOtp = pastedData.split('').concat(Array(length).fill('')).slice(0, length)
    setOtp(newOtp)
    onChange?.(newOtp.join(''))

    const nextEmptyIndex = newOtp.findIndex(d => !d)
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else {
      inputRefs.current[length - 1]?.focus()
    }

    if (pastedData.length === length) {
      onComplete?.(pastedData)
    }
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ''}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`
            w-11 h-14 text-center text-2xl font-bold font-display
            border-2 rounded-md bg-surface-card
            transition-all outline-none
            ${
              error
                ? 'border-brand-red bg-brand-red-light'
                : otp[index]
                ? 'border-brand-indigo bg-brand-indigo-light'
                : 'border-border-default'
            }
            focus:shadow-[0_0_0_3px_rgba(27,79,204,0.15)]
          `}
          whileFocus={{ 
            scale: 1.05, 
            borderColor: error ? 'var(--brand-red)' : 'var(--brand-indigo)',
            transition: { type: 'spring', stiffness: 300, damping: 20 }
          }}
          animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={error ? { duration: 0.4 } : {}}
        />
      ))}
    </div>
  )
}
