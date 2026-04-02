'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';

const rotatingMessages = [
  "Rain stops deliveries. We've got you covered.",
  "Auto-payout in minutes. No forms, no waiting.",
  "₹29/week. Cancel anytime.",
];

export default function AuthPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Rotating messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timeout = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timeout);
    }
  }, [resendTimer]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setStep('otp');
    setResendTimer(45);
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);
    otpRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.some((digit) => !digit)) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Simulate wrong OTP for demo
    const otpCode = otp.join('');
    if (otpCode !== '123456') {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setIsLoading(false);
      otpRefs.current[0]?.focus();
      return;
    }

    // Success - redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handleResendOtp = async () => {
    setResendTimer(45);
    setError('');
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Section - Left/Top */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative lg:w-1/2 h-[40vh] lg:h-screen bg-surface-inverse overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-primary opacity-30 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-accent opacity-20 blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-text-inverse"
            >
              <path
                d="M16 3L4 9v7c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V9l-12-6z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M11 16l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-text-inverse">
              Suraksha Weekly
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl lg:text-2xl text-indigo-200 mb-12 font-display">
            Your income. Protected.
          </p>

          {/* Rotating messages */}
          <div className="h-20 lg:h-24">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-lg lg:text-xl text-indigo-100 font-body max-w-md"
              >
                {rotatingMessages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Diagonal edge for desktop */}
        <div className="hidden lg:block absolute top-0 right-0 h-full w-24 bg-surface-base transform translate-x-12 -skew-x-6" />
      </motion.div>

      {/* Form Section - Right/Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12 bg-surface-base"
      >
        <div className="w-full max-w-md">
          <div className="bg-surface-card rounded-xl shadow-card p-8 lg:p-10">
            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="font-display text-2xl font-semibold text-text-primary mb-6">
                    Enter your mobile number
                  </h2>

                  <form onSubmit={handlePhoneSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="phone" className="sr-only">
                        Mobile Number
                      </label>
                      <div className="flex items-center gap-3 px-4 py-4 rounded-md border border-border bg-surface-card focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-0 transition-all">
                        <span className="text-2xl">🇮🇳</span>
                        <span className="font-mono text-text-secondary">+91</span>
                        <input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) =>
                            setPhone(e.target.value.replace(/\D/g, ''))
                          }
                          placeholder="98765 43210"
                          className="flex-1 font-mono text-lg bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
                          autoFocus
                          aria-invalid={!!error}
                          aria-describedby={error ? 'phone-error' : undefined}
                        />
                      </div>
                      {error && step === 'phone' && (
                        <p
                          id="phone-error"
                          className="mt-2 text-sm text-brand-danger"
                          role="alert"
                          aria-live="polite"
                        >
                          {error}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      isLoading={isLoading}
                      className="font-display"
                    >
                      Send OTP
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '', '', '']);
                      setError('');
                    }}
                    className="mb-4 text-sm text-text-accent hover:text-brand-primary-hover transition-colors flex items-center gap-1"
                    aria-label="Go back to phone number entry"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M10 12L6 8l4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Change number
                  </button>

                  <h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
                    Enter OTP
                  </h2>
                  <p className="text-text-secondary mb-6">
                    Sent to +91 {phone}
                  </p>

                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div>
                      <label className="sr-only">Enter 6-digit OTP</label>
                      <div className="flex gap-2 justify-between">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (otpRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) =>
                              handleOtpChange(index, e.target.value)
                            }
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={index === 0 ? handleOtpPaste : undefined}
                            className={`w-12 h-14 text-center text-2xl font-mono rounded-md border-2 transition-all ${
                              error
                                ? 'border-brand-danger animate-shake'
                                : digit
                                ? 'border-brand-primary bg-brand-primary-light'
                                : 'border-border'
                            } focus:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-0 outline-none`}
                            aria-label={`Digit ${index + 1}`}
                            aria-invalid={!!error}
                          />
                        ))}
                      </div>
                      {error && step === 'otp' && (
                        <p
                          className="mt-3 text-sm text-brand-danger"
                          role="alert"
                          aria-live="polite"
                        >
                          {error}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      isLoading={isLoading}
                      className="font-display"
                    >
                      Verify OTP
                    </Button>

                    <div className="text-center">
                      {resendTimer > 0 ? (
                        <p className="text-sm text-text-muted">
                          Resend OTP in{' '}
                          <span className="font-mono font-medium text-text-secondary">
                            0:{resendTimer.toString().padStart(2, '0')}
                          </span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="text-sm text-text-accent hover:text-brand-primary-hover font-medium transition-colors"
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

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5L2 4.5v3.5c0 3.75 2.6 7.25 6 8 3.4-.75 6-4.25 6-8V4.5l-6-3z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M6 7.5l1.5 1.5L11 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>IRDAI Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1v14M1 8h14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
