'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { useOnboardingStore } from '@/store/onboarding'
import confetti from 'canvas-confetti'

// ===== TYPES =====
type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH'

// ===== CONSTANTS =====
const CITIES = [
  { name: 'Mumbai', emoji: '🌧' },
  { name: 'Delhi', emoji: '🌫' },
  { name: 'Bengaluru', emoji: '⛈' },
  { name: 'Hyderabad', emoji: '☀' },
  { name: 'Chennai', emoji: '🌊' },
  { name: 'Pune', emoji: '🌦' },
  { name: 'Other city', emoji: '📍' },
]

const PLATFORMS = [
  { name: 'Swiggy', color: '#FC8019', bgColor: 'rgba(252, 128, 25, 0.1)' },
  { name: 'Zomato', color: '#E23744', bgColor: 'rgba(226, 55, 68, 0.1)' },
  { name: 'Other', color: 'var(--brand-indigo)', bgColor: 'var(--brand-indigo-light)' },
]

const STEP_LABELS = ['Profile', 'Schedule', 'Risk Profile', 'Your Plan']

const RISK_TIERS = {
  LOW: {
    color: 'emerald',
    message: "You're in a low-risk zone this season",
    icon: '🛡️',
  },
  MEDIUM: {
    color: 'amber',
    message: 'Moderate disruption risk in your area',
    icon: '⚠️',
  },
  HIGH: {
    color: 'indigo',
    message: "Higher risk zone — you'll benefit most from coverage",
    icon: '🔒',
  },
}

const RISK_FACTORS = [
  { icon: '🌧', label: 'Monsoon Zone', effect: '↑' },
  { icon: '🏙', label: 'Metro City', effect: '→' },
  { icon: '⏰', label: 'Peak Hours', effect: '↑' },
]

const STEPS = [
  { id: 0, label: 'Profile' },
  { id: 1, label: 'Schedule' },
  { id: 2, label: 'Risk Profile' },
  { id: 3, label: 'Your Plan' },
]

// ===== COMPONENTS =====
      parseInt(weeklyEarnings.replace(/,/g, '')) > 5000 ? 1.15 : 1;
    return Math.round(baseRate * hourMultiplier * earningsMultiplier);
  };

  const calculateCoverage = () => {
    const earnings = parseInt(weeklyEarnings.replace(/,/g, '')) || 3000;
    return earnings * 4; // 4 weeks coverage
  };

  const premium = calculatePremium();
  const coverage = calculateCoverage();

  // Step 3 calculation effect
  useEffect(() => {
    if (currentStep === 3) {
      setIsCalculating(true);
      const timer = setTimeout(() => {
        setIsCalculating(false);
        // Calculate risk based on hours and earnings
        const hours = hoursPerDay;
        const earnings = parseInt(weeklyEarnings.replace(/,/g, '')) || 0;
        if (hours > 10 || earnings < 2000) {
          setRiskTier('HIGH');
        } else if (hours > 7 || earnings < 4000) {
          setRiskTier('MEDIUM');
        } else {
          setRiskTier('LOW');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, hoursPerDay, weeklyEarnings]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedCity && selectedPlatform;
      case 2:
        return hoursPerDay > 0 && weeklyEarnings;
      case 3:
        return !isCalculating;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 4) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleActivate = () => {
    setShowConfetti(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString('en-IN');
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-surface-base py-8 px-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: '50vw',
                y: '50vh',
                opacity: 1,
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0,
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.5,
              }}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: [
                  '#1B4FCC',
                  '#F5A623',
                  '#00C896',
                  '#E53535',
                ][i % 4],
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10" />
            <motion.div
              className="absolute top-1/2 left-0 h-0.5 bg-brand-primary -z-10"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />

            {/* Step Dots */}
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative flex flex-col items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-sm ${
                    step < currentStep
                      ? 'bg-brand-primary text-text-inverse'
                      : step === currentStep
                      ? 'bg-brand-primary text-text-inverse'
                      : 'bg-surface-card border-2 border-border text-text-muted'
                  }`}
                  animate={
                    step === currentStep
                      ? {
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  {step < currentStep ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M6 10l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </motion.div>
                <span className="absolute -bottom-6 text-xs text-text-muted whitespace-nowrap">
                  {step === 1 && 'About You'}
                  {step === 2 && 'Your Week'}
                  {step === 3 && 'Risk Profile'}
                  {step === 4 && 'Your Plan'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-20">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="bg-surface-card rounded-xl shadow-card p-8">
                {/* Step 1 */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-text-primary mb-2">
                        Tell us about yourself
                      </h2>
                      <p className="text-text-secondary">
                        This helps us personalize your coverage
                      </p>
                    </div>

                    <div>
                      <label className="block font-display font-medium text-text-primary mb-4">
                        Which city do you work in?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CITIES.map((city) => (
                          <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`px-6 py-4 rounded-full font-medium transition-all ${
                              selectedCity === city
                                ? 'bg-brand-primary text-text-inverse shadow-brand'
                                : 'bg-surface-subtle text-text-secondary hover:bg-surface-card hover:shadow-card'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-display font-medium text-text-primary mb-4">
                        Primary delivery platform
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {PLATFORMS.map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => setSelectedPlatform(platform.id)}
                            className={`p-6 rounded-lg border-2 transition-all ${
                              selectedPlatform === platform.id
                                ? platform.id === 'swiggy'
                                  ? 'border-orange-500 bg-orange-50'
                                  : platform.id === 'zomato'
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-brand-primary bg-brand-primary-light'
                                : 'border-border bg-surface-card hover:border-brand-primary'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">
                                {platform.id === 'swiggy' && '🍊'}
                                {platform.id === 'zomato' && '🍅'}
                                {platform.id === 'other' && '📦'}
                              </div>
                              <p className="font-display font-semibold text-text-primary">
                                {platform.name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-text-primary mb-2">
                        Your typical week
                      </h2>
                      <p className="text-text-secondary">
                        Help us understand your work pattern
                      </p>
                    </div>

                    <div>
                      <label className="block font-display font-medium text-text-primary mb-6">
                        How many hours do you usually work per day?
                      </label>

                      {/* Custom Slider */}
                      <div className="relative py-8">
                        <input
                          type="range"
                          min="2"
                          max="14"
                          value={hoursPerDay}
                          onChange={(e) =>
                            setHoursPerDay(parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-surface-subtle rounded-full appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #1B4FCC 0%, #1B4FCC ${
                              ((hoursPerDay - 2) / 12) * 100
                            }%, #EEF1FA ${
                              ((hoursPerDay - 2) / 12) * 100
                            }%, #EEF1FA 100%)`,
                          }}
                        />
                        {/* Motorcycle Icon */}
                        <div
                          className="absolute top-0 transform -translate-x-1/2 transition-all"
                          style={{
                            left: `${((hoursPerDay - 2) / 12) * 100}%`,
                          }}
                        >
                          <div className="text-4xl">🏍️</div>
                        </div>
                      </div>

                      <div className="text-center mt-8">
                        <p className="font-display text-5xl font-bold text-brand-primary">
                          ~{hoursPerDay} hours/day
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-display font-medium text-text-primary mb-4">
                        Your average weekly earnings
                      </label>
                      <div className="flex items-center gap-3 px-6 py-4 rounded-md border-2 border-border bg-surface-card focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary transition-all">
                        <span className="font-mono text-3xl text-text-secondary">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={weeklyEarnings}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            if (/^\d*$/.test(value)) {
                              setWeeklyEarnings(formatCurrency(value));
                            }
                          }}
                          placeholder="5,000"
                          className="flex-1 font-mono text-3xl bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
                        />
                      </div>
                      <p className="mt-3 text-sm text-text-muted">
                        This helps us calculate your coverage amount. We keep
                        this private.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-text-primary mb-2">
                        Your protection profile
                      </h2>
                      <p className="text-text-secondary">
                        Based on your work pattern
                      </p>
                    </div>

                    <div className="min-h-[400px] flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {isCalculating ? (
                          <motion.div
                            key="calculating"
                            initial={{ opacity: 0, rotateY: 0 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                              className="inline-block mb-6"
                            >
                              <svg
                                width="64"
                                height="64"
                                viewBox="0 0 64 64"
                                fill="none"
                                className="text-brand-primary"
                              >
                                <path
                                  d="M32 6L8 18v14c0 15 10.4 29 24 32 13.6-3 24-17 24-32V18L32 6z"
                                  fill="currentColor"
                                  fillOpacity="0.2"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                              </svg>
                            </motion.div>
                            <p className="font-display text-xl text-text-primary">
                              Calculating your risk profile...
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full space-y-6"
                          >
                            {/* Risk Badge */}
                            <div className="flex justify-center">
                              <div
                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-display font-bold text-lg ${
                                  riskTier === 'LOW'
                                    ? 'bg-brand-accent-light text-brand-accent'
                                    : riskTier === 'MEDIUM'
                                    ? 'bg-brand-secondary-light text-brand-secondary'
                                    : 'bg-brand-danger-light text-brand-danger'
                                }`}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M12 2L4 6v5c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"
                                    fill="currentColor"
                                    fillOpacity="0.2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                </svg>
                                {riskTier} RISK
                              </div>
                            </div>

                            {/* Risk Factors */}
                            <div>
                              <p className="text-sm font-medium text-text-secondary mb-3 text-center">
                                Factors affecting your premium
                              </p>
                              <div className="flex flex-wrap justify-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-subtle text-text-primary text-sm">
                                  <span>⏰</span>
                                  <span>{hoursPerDay} hrs/day</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-subtle text-text-primary text-sm">
                                  <span>📍</span>
                                  <span>{selectedCity}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-subtle text-text-primary text-sm">
                                  <span>💼</span>
                                  <span>
                                    {PLATFORMS.find(
                                      (p) => p.id === selectedPlatform
                                    )?.name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Trust Score */}
                            <div>
                              <div className="flex justify-between items-baseline mb-2">
                                <p className="text-sm font-medium text-text-secondary">
                                  Trust Score
                                </p>
                                <p className="font-display text-2xl font-bold text-brand-primary">
                                  {trustScore}%
                                </p>
                              </div>
                              <div className="h-3 bg-surface-subtle rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${trustScore}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
                                />
                              </div>
                              <p className="mt-2 text-xs text-text-muted">
                                Your trust score improves as you maintain a
                                clean claim history
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-display text-3xl font-semibold text-text-primary mb-2">
                        Your weekly plan
                      </h2>
                      <p className="text-text-secondary">
                        Tailored protection for your income
                      </p>
                    </div>

                    {/* Plan Card */}
                    <div className="rounded-xl overflow-hidden shadow-elevated">
                      {/* Top Section - Premium */}
                      <div className="bg-surface-inverse p-8 text-center">
                        <p className="text-indigo-200 font-display text-sm uppercase tracking-wider mb-2">
                          Weekly Premium
                        </p>
                        <p className="font-display text-6xl font-bold text-brand-secondary">
                          ₹{premium}
                        </p>
                      </div>

                      {/* Bottom Section - Coverage */}
                      <div className="bg-surface-card p-8 space-y-6">
                        <div>
                          <p className="text-text-secondary text-sm mb-2">
                            Coverage up to
                          </p>
                          <p className="font-display text-3xl font-bold text-brand-primary">
                            ₹{coverage.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-accent-light flex items-center justify-center text-xl">
                              🌧️
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">
                                Weather Protection
                              </p>
                              <p className="text-sm text-text-secondary">
                                Heavy rain, storms
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-secondary-light flex items-center justify-center text-xl">
                              🔥
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">
                                Heat Wave Coverage
                              </p>
                              <p className="text-sm text-text-secondary">
                                Temperature &gt; 42°C
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-primary-light flex items-center justify-center text-xl">
                              💨
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">
                                Air Quality Protection
                              </p>
                              <p className="text-sm text-text-secondary">
                                AQI &gt; 300
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Explainer Accordion */}
                        <div className="border-t border-border-subtle pt-6">
                          <button
                            onClick={() => setShowExplainer(!showExplainer)}
                            className="flex items-center justify-between w-full text-left"
                          >
                            <span className="font-medium text-text-primary">
                              Why this price?
                            </span>
                            <motion.svg
                              animate={{ rotate: showExplainer ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <path
                                d="M5 7.5l5 5 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </motion.svg>
                          </button>

                          <AnimatePresence>
                            {showExplainer && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 space-y-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">
                                      Base coverage
                                    </span>
                                    <span className="text-text-primary font-mono">
                                      ₹29
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">
                                      Working hours ({hoursPerDay}hrs/day)
                                    </span>
                                    <span className="text-text-primary font-mono">
                                      {hoursPerDay > 8 ? '+₹6' : '₹0'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">
                                      Earnings tier
                                    </span>
                                    <span className="text-text-primary font-mono">
                                      {parseInt(
                                        weeklyEarnings.replace(/,/g, '')
                                      ) > 5000
                                        ? '+₹4'
                                        : '₹0'}
                                    </span>
                                  </div>
                                  <div className="pt-3 border-t border-border-subtle flex justify-between font-medium">
                                    <span className="text-text-primary">
                                      Total weekly premium
                                    </span>
                                    <span className="text-brand-primary font-mono">
                                      ₹{premium}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleActivate}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="font-display text-lg"
                      >
                        Activate Coverage — ₹{premium}
                      </Button>
                      <p className="text-center text-sm text-text-muted">
                        Cancel anytime. Renews weekly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-12">
                  {currentStep > 1 && (
                    <Button
                      onClick={handleBack}
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  {currentStep < 4 && (
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      size="lg"
                      disabled={!canProceed()}
                      className={`${
                        currentStep === 1 ? 'w-full' : 'flex-1'
                      } font-display`}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
