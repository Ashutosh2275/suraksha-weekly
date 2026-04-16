'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

const VALUE_PROPS = [
  'When rain stops deliveries — we pay you.',
  'Auto-payout in minutes. No claim forms.',
  'Trusted by 10,000+ delivery partners.',
]

export default function AuthPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)
  const [messageIndex, setMessageIndex] = useState(0)
  const [resendTimer, setResendTimer] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Rotating value props
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % VALUE_PROPS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timeout = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timeout)
    }
  }, [resendTimer])

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 5) return cleaned
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanPhone = phone.replace(/\s/g, '')
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setStep('otp')
    setResendTimer(45)
    setTimeout(() => otpRefs.current[0]?.focus(), 300)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtp(newOtp)
    otpRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.some((digit) => !digit)) {
      setError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const otpCode = otp.join('')
    if (otpCode !== '123456') {
      setAttemptsRemaining(prev => prev - 1)
      setError(`Incorrect code. ${attemptsRemaining - 1} attempts remaining.`)
      setOtp(['', '', '', '', '', ''])
      setIsLoading(false)
      otpRefs.current[0]?.focus()
      return
    }

    // Success - log in and redirect
    login(phone)
    router.push('/dashboard')
  }

  const handleResendOtp = async () => {
    setResendTimer(45)
    setError('')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Hero Section - Top 55vh mobile, Left 45% desktop */}
      <div className="hero-section relative lg:w-[45%] min-h-[55vh] lg:min-h-screen bg-surface-dark overflow-hidden">
        {/* Radial gradient overlays */}
        <div className="absolute inset-0 bg-surface-dark">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 30% 50%, rgba(27,79,204,0.4) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 30%, rgba(0,200,150,0.15) 0%, transparent 50%)
            `
          }} />
        </div>

        {/* Floating circles */}
        <div className="absolute inset-0 opacity-60">
          <div className="floating-circle absolute top-1/4 left-1/3 w-[100px] h-[100px] rounded-full bg-brand-indigo opacity-[0.06]" 
               style={{ animationDelay: '0s', animationDuration: '8s' }} />
          <div className="floating-circle absolute top-1/2 right-1/4 w-[60px] h-[60px] rounded-full bg-brand-indigo opacity-[0.06]" 
               style={{ animationDelay: '2s', animationDuration: '10s' }} />
          <div className="floating-circle absolute bottom-1/3 left-1/4 w-[40px] h-[40px] rounded-full bg-brand-indigo opacity-[0.06]" 
               style={{ animationDelay: '4s', animationDuration: '6s' }} />
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 grid-pattern" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-12">
          {/* Shield Icon with pulsing rings */}
          <motion.div 
            className="mb-6 relative w-20"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0 }}
          >
            {/* Pulsing rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[0, 0.3, 0.6].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute w-20 h-20 rounded-full border-2 border-brand-indigo"
                  animate={{
                    scale: [1, 2, 2],
                    opacity: [0.6, 0.3, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>

            {/* Shield SVG */}
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <defs>
                <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--brand-indigo)" />
                  <stop offset="100%" stopColor="var(--brand-indigo-dark)" />
                </linearGradient>
              </defs>
              <path
                d="M40 10L15 20v17.5c0 15.625 10.833 30.208 25 33.333 14.167-3.125 25-17.708 25-33.333V20L40 10z"
                fill="url(#shieldGradient)"
                fillOpacity="0.2"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M30 40l7.5 7.5L55 30"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-2"
          >
            <h1 className="font-display text-[28px] leading-tight">
              <span className="font-bold text-white">Suraksha</span>{' '}
              <span className="font-normal text-white/60">Weekly</span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-sm font-body text-white/50 mb-8"
          >
            Income protection for delivery partners
          </motion.p>

          {/* Rotating value props */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="h-16 lg:h-20"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5 }}
                className="text-base lg:text-lg font-body text-white/80 max-w-md"
              >
                {VALUE_PROPS[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Form Panel - Bottom 45vh mobile, Right 55% desktop */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 100, damping: 20 }}
        className="flex-1 bg-white rounded-t-[24px] lg:rounded-none relative z-20 -mt-6 lg:mt-0 lg:w-[55%]"
      >
        <div className="h-full flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="font-display font-semibold text-[22px] text-primary mb-2">
                    Enter your mobile number
                  </h2>
                  <p className="text-sm font-body text-muted mb-8">
                    We'll send a 6-digit code to verify
                  </p>

                  <form onSubmit={handlePhoneSubmit} className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 h-14 px-4 rounded-xl border-2 border-border-default bg-white focus-within:border-brand-indigo focus-within:shadow-[0_0_0_3px_rgba(27,79,204,0.12)] transition-all">
                        <span className="text-xl">🇮🇳</span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-secondary">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, '')))}
                          placeholder="98765 43210"
                          className="flex-1 text-lg font-display bg-transparent border-none outline-none text-primary placeholder:text-muted"
                          autoFocus
                          style={{ fontSize: '18px' }}
                        />
                      </div>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-brand-red flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {error}
                        </motion.p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={isLoading}
                      className="h-[52px] text-base font-display font-semibold group"
                    >
                      {!isLoading && (
                        <>
                          Send OTP
                          <motion.span
                            className="inline-block ml-1"
                            whileHover={{ x: 4 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            →
                          </motion.span>
                        </>
                      )}
                      {isLoading && 'Sending...'}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => {
                      setStep('phone')
                      setOtp(['', '', '', '', '', ''])
                      setError('')
                    }}
                    className="mb-6 text-sm text-brand hover:text-brand-indigo-dark transition-colors flex items-center gap-1 font-medium"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Change number
                  </button>

                  <h2 className="font-display font-semibold text-[22px] text-primary mb-2">
                    Enter the code sent to
                  </h2>
                  <p className="text-sm font-body text-secondary mb-8">
                    +91 {phone}
                  </p>

                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div>
                      <div className="flex gap-2 justify-between">
                        {otp.map((digit, index) => (
                          <motion.input
                            key={index}
                            ref={(el) => {
                              otpRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={index === 0 ? handleOtpPaste : undefined}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            style={{ color: 'var(--text-primary)' }}
                            className={`
                              w-11 h-14 text-center text-2xl font-bold font-display
                              rounded-md border-2 transition-all outline-none
                              ${error 
                                ? 'border-brand-red bg-brand-red-light animate-shake' 
                                : digit
                                ? 'border-brand-indigo bg-brand-indigo-light'
                                : 'border-border-default'
                              }
                              focus:border-brand-indigo focus:shadow-[0_0_0_3px_rgba(27,79,204,0.15)] focus:scale-105
                            `}
                          />
                        ))}
                      </div>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 text-sm text-brand-red flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {error}
                        </motion.p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={isLoading}
                      className="h-[52px] text-base font-display font-semibold"
                    >
                      {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </Button>

                    <div className="text-center">
                      {resendTimer > 0 ? (
                        <p className="text-sm text-muted">
                          Resend in{' '}
                          <span className="font-mono font-semibold text-secondary">
                            0:{resendTimer.toString().padStart(2, '0')}
                          </span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="text-sm text-brand hover:text-brand-indigo-dark font-semibold transition-colors"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .floating-circle {
          animation: float ease-in-out infinite;
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  )
}
