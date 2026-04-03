# Onboarding Wizard - Implementation Guide

## Current Status

The file `apps/worker-web/src/app/(auth)/onboarding/page.tsx` already exists but needs to be rebuilt according to new specifications.

## Required Implementation

### 1. Create Zustand Store

Create `apps/worker-web/src/store/onboarding.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingState {
  currentStep: number
  city: string
  platform: string
  hoursPerDay: number
  weeklyEarnings: number
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH'
  trustScore: number
  weeklyPremium: number
  
  setCurrentStep: (step: number) => void
  setCity: (city: string) => void
  setPlatform: (platform: string) => void
  setHoursPerDay: (hours: number) => void
  setWeeklyEarnings: (earnings: number) => void
  setRiskTier: (tier: 'LOW' | 'MEDIUM' | 'HIGH') => void
  setTrustScore: (score: number) => void
  setWeeklyPremium: (premium: number) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 0,
      city: '',
      platform: '',
      hoursPerDay: 6,
      weeklyEarnings: 4200,
      riskTier: 'MEDIUM',
      trustScore: 80,
      weeklyPremium: 67,
      
      setCurrentStep: (step) => set({ currentStep: step }),
      setCity: (city) => set({ city }),
      setPlatform: (platform) => set({ platform }),
      setHoursPerDay: (hours) => set({ hoursPerDay: hours }),
      setWeeklyEarnings: (earnings) => set({ weeklyEarnings: earnings }),
      setRiskTier: (tier) => set({ riskTier: tier }),
      setTrustScore: (score) => set({ trustScore: score }),
      setWeeklyPremium: (premium) => set({ weeklyPremium: premium }),
      
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 3) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
      reset: () => set({ currentStep: 0, city: '', platform: '', hoursPerDay: 6, weeklyEarnings: 4200 }),
    }),
    {
      name: 'suraksha-onboarding',
    }
  )
)
```

**Installation required:**
```bash
npm install zustand
```

### 2. Step Progress Bar Component

Sticky top bar showing 4 connected dots with labels.

**Features:**
- Past steps: Filled indigo circle with white checkmark
- Current step: Larger indigo circle with white dot + pulsing glow ring
- Future steps: Gray empty circle
- Connecting lines fill with indigo animation (400ms) when advancing

### 3. Step 1: Profile

**City Selector:**
- 3-column grid of pill buttons (48px height, rounded-full)
- Cities: Mumbai 🌧, Delhi 🌫, Bengaluru ⛈, Hyderabad ☀, Chennai 🌊, Pune 🌦, Other city 📍
- Selected: indigo border, light indigo background, scale(1.04) spring bounce

**Platform Selector:**
- 3 large cards (72px height)
- Swiggy: #FC8019 border/tint
- Zomato: #E23744 border/tint
- Other: Indigo
- Hover: lift effect

**Continue Button:**
- Disabled until both city and platform selected
- Slides up when enabled (Framer Motion layout)

### 4. Step 2: Schedule

**Hours Per Day Slider:**
- Custom slider (2-12 hours)
- Track: 6px height, rounded
- Filled portion: Indigo gradient
- Handle: 28px circle with shadow
- Floating tooltip above handle showing current value
- Scale labels below: "2h 4h 6h 8h 10h 12h"
- Big display: "You work ~6 hours per day" (28px Sora, indigo)

**Weekly Earnings Input:**
- Large input with ₹ prefix (amber)
- 24px Sora font, right-aligned
- Auto-formats with Indian commas: "4,200"
- Live update: "Protected up to ₹X,XXX" label

### 5. Step 3: Risk Profile

**Auto-computes on enter. No user input.**

**Loading State (2.5 seconds):**
- Large shield SVG (120px) centered
- Shield fills from bottom with indigo (CSS clip-path animation)
- Text: "Analysing your risk profile..." (pulses)
- Three dots bounce sequentially

**Result Card (3D flip animation):**

Top section (indigo gradient):
- Shield icon + tier label
- LOW: Emerald shield + message
- MEDIUM: Amber shield + message  
- HIGH: Indigo shield + message

Bottom section (white):
- 3 factor chips: icon + label + effect arrow
- Trust Score bar (80/100)
- Sub-text about premium unlocks

**Auto-advances to Step 4 after 3 seconds**

### 6. Step 4: Your Plan

**Plan Card (hero element):**

Top section (indigo gradient):
- "WEEKLY PREMIUM" label
- "₹67" large (48px Sora white)
- "Billed weekly · Cancel anytime"

Wavy SVG divider

Bottom section (white):
- "Coverage up to ₹1,500" (indigo)
- 3 coverage chips: 🌧 Heavy Rain, 🌡 Extreme Heat, 🏭 Severe Pollution

**"Why ₹67?" Expandable:**
- Collapsed: question + chevron
- Expanded: 3 factor rows with pricing, total row

**CTA Button:**
- "Activate Coverage · ₹67/week"
- Full width, 56px height
- Lock icon 🔒 on right
- On tap:
  1. Loading spinner (500ms)
  2. Full screen emerald overlay
  3. Confetti burst
  4. Large checkmark (stroke-dashoffset animation)
  5. "You're covered!" text
  6. "Coverage active until Sunday, 7 Apr"
  7. After 2s: redirect to /dashboard

**Confetti library:**
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

### 7. Step Transitions

**AnimatePresence:**
- Exiting: slides left (x: -60px) + fade out
- Entering: slides from right (x: 60px to 0) + fade in
- Duration: 350ms, ease-out

### 8. localStorage Persistence

State automatically persists via Zustand persist middleware.
Refreshing doesn't lose progress.

## File Structure

```
apps/worker-web/src/
├── store/
│   └── onboarding.ts                    # Zustand store
└── app/(auth)/onboarding/
    ├── page.tsx                         # Main wizard
    └── components/
        ├── StepProgress.tsx             # Progress bar
        ├── Step1Profile.tsx             # City + platform
        ├── Step2Schedule.tsx            # Hours + earnings
        ├── Step3RiskProfile.tsx         # Auto-analysis
        └── Step4Plan.tsx                # Plan + activation
```

## Implementation Notes

1. **Zustand Setup:** Install zustand first
2. **Confetti:** Install canvas-confetti for success state
3. **Framer Motion:** Already installed (from previous work)
4. **Design Tokens:** Use existing CSS variables from design system
5. **Components:** Use Button from UI library

## Testing Checklist

- [ ] Step progress bar shows correct state
- [ ] Step 1: Can't continue without city and platform
- [ ] Step 2: Slider updates display live
- [ ] Step 2: Earnings format with commas
- [ ] Step 3: Auto-computes and advances
- [ ] Step 4: Expandable "Why ₹67?" section works
- [ ] Step 4: Confetti shows on activation
- [ ] localStorage persists state on refresh
- [ ] All animations smooth and performant

## Risk Calculation Logic

Simple logic for demo:
- Mumbai/Bengaluru → HIGH risk
- Delhi/Chennai → MEDIUM risk
- Others → LOW risk

## Premium Calculation

Base premium ₹67 for demo.
In production, calculate based on:
- Hours per day
- Weekly earnings
- City risk tier
- Platform
