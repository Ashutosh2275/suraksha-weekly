# 🎨 ONBOARDING WIZARD - FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SURAKSHA WEEKLY ONBOARDING WIZARD                         │
│                                4-Step Journey                                    │
└─────────────────────────────────────────────────────────────────────────────────┘


USER LANDS ON: /onboarding
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROGRESS BAR (Sticky Top)                                                      │
│  ●━━━○━━━○━━━○                                                                  │
│  Profile  Schedule  Risk  Plan                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 0: PROFILE SELECTION                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  "Where do you deliver?"                                                │   │
│  │                                                                           │   │
│  │  City Selector (3×3 grid):                                              │   │
│  │  [🌧 Mumbai] [🌫 Delhi] [⛈ Bengaluru]                                   │   │
│  │  [☀ Hyderabad] [🌊 Chennai] [🌦 Pune]                                   │   │
│  │  [📍 Other city]                                                         │   │
│  │                                                                           │   │
│  │  Platform Selector:                                                      │   │
│  │  [Swiggy 🟠] [Zomato 🔴] [Other 🔵]                                      │   │
│  │                                                                           │   │
│  │  State: city = "Mumbai", platform = "Swiggy"                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Back (disabled)] [Continue] ← Only enabled if city AND platform selected     │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ Click "Continue"
         │ Slide transition (350ms)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROGRESS BAR                                                                    │
│  ●━━●━━━○━━─○                                                                   │
│  Profile  Schedule  Risk  Plan                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: SCHEDULE SETUP                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  "Your work schedule"                                                   │   │
│  │                                                                           │   │
│  │  Hours per day:                                                          │   │
│  │         ┌───┐                                                            │   │
│  │         │6h │ ← Floating tooltip                                         │   │
│  │         └─┬─┘                                                            │   │
│  │  ━━━━━━━●━━━━━━━━━━━━━                                                  │   │
│  │  2h  4h  6h  8h  10h 12h                                                 │   │
│  │                                                                           │   │
│  │  "You work ~6 hours per day"                                            │   │
│  │                                                                           │   │
│  │  Weekly earnings:                                                        │   │
│  │  ┌────────────────────────┐                                             │   │
│  │  │  ₹  4,200              │                                              │   │
│  │  └────────────────────────┘                                             │   │
│  │  Protected up to ₹1,470                                                 │   │
│  │                                                                           │   │
│  │  State: hoursPerDay = 6, weeklyEarnings = 4200                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Back] [Continue]                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ Click "Continue"
         │ Slide transition (350ms)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROGRESS BAR                                                                    │
│  ●━━●━━●━━━○                                                                    │
│  Profile  Schedule  Risk  Plan                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: RISK PROFILE (AUTO-COMPUTE)                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  "Your risk profile"                                                    │   │
│  │                                                                           │   │
│  │  PHASE 1: Loading (2.5 seconds)                                         │   │
│  │  ┌─────────────────────────────────────┐                                │   │
│  │  │         ╱╲                          │                                │   │
│  │  │        ╱░░╲  ← Shield fills         │                                │   │
│  │  │       ╱░░░░╲    from bottom         │                                │   │
│  │  │      ╱░░░░░░╲                       │                                │   │
│  │  │     ╱__░░░░__╲                      │                                │   │
│  │  │                                      │                                │   │
│  │  │  "Analysing your risk profile..."   │                                │   │
│  │  │           ● ● ● (pulsing)           │                                │   │
│  │  └─────────────────────────────────────┘                                │   │
│  │                                                                           │   │
│  │  ↓ After 2.5 seconds                                                    │   │
│  │                                                                           │   │
│  │  PHASE 2: Result (3D Flip, 1.5 seconds)                                │   │
│  │  ┌─────────────────────────────────────┐                                │   │
│  │  │ ╔═══════════════════════════════╗  │                                │   │
│  │  │ ║ 🛡️  HIGH RISK               ║  │ ← Indigo gradient              │   │
│  │  │ ║ Higher risk zone — you'll   ║  │                                │   │
│  │  │ ║ benefit most from coverage  ║  │                                │   │
│  │  │ ╚═══════════════════════════════╝  │                                │   │
│  │  │─────────────────────────────────────│                                │   │
│  │  │ Risk Factors:                       │                                │   │
│  │  │ [🌧 Monsoon][🏙 Metro][⏰ Peak]    │                                │   │
│  │  │                                      │                                │   │
│  │  │ Trust Score           80/100        │                                │   │
│  │  │ ████████████████░░░░                │ ← Animates to 80%             │   │
│  │  └─────────────────────────────────────┘                                │   │
│  │                                                                           │   │
│  │  Logic: city = "Mumbai" → riskTier = "HIGH"                            │   │
│  │         trustScore = 80 (fixed for demo)                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  No buttons - AUTO-ADVANCES after 4 seconds total (2.5s + 1.5s)                │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ Auto-advance
         │ Slide transition (350ms)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROGRESS BAR                                                                    │
│  ●━━●━━●━━●                                                                     │
│  Profile  Schedule  Risk  Plan                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: YOUR PLAN                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  "Your protection plan"                                                 │   │
│  │                                                                           │   │
│  │  ┌───────────────────────────────────┐                                  │   │
│  │  │ ╔═══════════════════════════════╗│                                  │   │
│  │  │ ║         ₹67                  ║│ ← Indigo gradient                │   │
│  │  │ ║     Billed weekly            ║│                                  │   │
│  │  │ ╚═══════════════════════════════╝│                                  │   │
│  │  │  ～～～～～～～～～～～～～～～～～│ ← Wavy SVG divider              │   │
│  │  │─────────────────────────────────── │                                  │   │
│  │  │    Coverage up to                  │                                  │   │
│  │  │        ₹1,500                      │                                  │   │
│  │  │                                    │                                  │   │
│  │  │ [🌧 Weather][🏥 Health][🚫 Platform]│                                  │   │
│  │  │                                    │                                  │   │
│  │  │ Why ₹67?               ⌄          │ ← Click to expand               │   │
│  │  └────────────────────────────────────┘                                  │   │
│  │                                                                           │   │
│  │  When expanded:                                                          │   │
│  │  ┌────────────────────────────────────┐                                 │   │
│  │  │ Base premium          ₹45         │                                 │   │
│  │  │ City risk factor      ₹12         │                                 │   │
│  │  │ Platform integration  ₹10         │                                 │   │
│  │  │ ────────────────────────────       │                                 │   │
│  │  │ Total                 ₹67         │                                 │   │
│  │  └────────────────────────────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │         Activate Coverage · ₹67/week                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  No footer nav - only Activate button                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ Click "Activate Coverage"
         │ Button shows loading (500ms)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SUCCESS OVERLAY (Full Screen)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │                    🎉 ✨ 🎊 🎉                                          │   │
│  │                                                                           │   │
│  │                      ┌────┐                                              │   │
│  │                      │ ✓  │ ← Animated checkmark                         │   │
│  │                      └────┘                                              │   │
│  │                                                                           │   │
│  │               You're covered!                                            │   │
│  │                                                                           │   │
│  │         Redirecting to your dashboard...                                 │   │
│  │                                                                           │   │
│  │                    ✨ 🎊 🎉 ✨                                          │   │
│  │                                                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Background: Emerald gradient                                                   │
│  Confetti: 3 waves (center, left, right)                                       │
│  Duration: 2 seconds                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         │ After 2 seconds
         │ router.push('/dashboard')
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  REDIRECT TO: /dashboard                                                        │
│  User now has active coverage!                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════

                              STATE MANAGEMENT FLOW

═══════════════════════════════════════════════════════════════════════════════════

Zustand Store (persisted to localStorage: 'suraksha-onboarding')
│
├─ currentStep: 0 → 1 → 2 → 3
├─ city: '' → 'Mumbai'
├─ platform: '' → 'Swiggy'
├─ hoursPerDay: 6 → user adjusts
├─ weeklyEarnings: 4200 → user adjusts
├─ riskTier: 'MEDIUM' → calculated → 'HIGH'
├─ trustScore: 80 (set during risk calculation)
└─ weeklyPremium: 67 (fixed for demo)


═══════════════════════════════════════════════════════════════════════════════════

                              ANIMATION TIMELINE

═══════════════════════════════════════════════════════════════════════════════════

Step 0 → Step 1:
├─ Exit: Slide left + fade (350ms)
└─ Enter: Slide from right + fade (350ms)

Step 1 → Step 2:
├─ Exit: Slide left + fade (350ms)
├─ Enter: Slide from right + fade (350ms)
├─ Loading: Shield fills (2000ms)
├─ Dots pulse (infinite, 1500ms each)
├─ Result: 3D flip rotateY 90→0 (500ms)
└─ Trust bar: Fill to 80% (1000ms, 500ms delay)

Step 2 → Step 3:
├─ Auto-advance delay: 4000ms total
├─ Exit: Slide left + fade (350ms)
└─ Enter: Slide from right + fade (350ms)

Activate Button:
├─ Loading: 500ms
├─ Overlay fade in: 200ms
├─ Confetti wave 1: 0ms (center)
├─ Confetti wave 2: 200ms (left)
├─ Confetti wave 3: 400ms (right)
├─ Checkmark draw: 500ms (500ms delay)
└─ Redirect: 2000ms total


═══════════════════════════════════════════════════════════════════════════════════

                              VALIDATION LOGIC

═══════════════════════════════════════════════════════════════════════════════════

Step 0: canProceed = city && platform
Step 1: canProceed = true (always)
Step 2: canProceed = true (auto-advances)
Step 3: No validation (just CTA)

Risk Calculation:
├─ IF city === 'Mumbai' OR 'Bengaluru' → HIGH
├─ ELSE IF city === 'Delhi' OR 'Chennai' → MEDIUM
└─ ELSE → LOW


═══════════════════════════════════════════════════════════════════════════════════

                              USER INTERACTIONS

═══════════════════════════════════════════════════════════════════════════════════

Step 0:
├─ Click city pill → Spring scale 1.04, indigo border
├─ Click platform card → Colored border, lift effect
└─ Click Continue → Advance to Step 1

Step 1:
├─ Drag slider → Tooltip follows, track fills
├─ Type earnings → Auto-format with commas
├─ Click Back → Return to Step 0
└─ Click Continue → Advance to Step 2

Step 2:
├─ No user interaction
├─ Watch loading animation (2.5s)
├─ Watch result reveal (1.5s)
└─ Auto-advance to Step 3

Step 3:
├─ Click "Why ₹67?" → Expand/collapse details
└─ Click "Activate Coverage" → Success flow


═══════════════════════════════════════════════════════════════════════════════════

                              RESPONSIVE BEHAVIOR

═══════════════════════════════════════════════════════════════════════════════════

Mobile (< 640px):
├─ Cities: 2 columns
├─ Platforms: Stack vertically
├─ Font sizes: Reduced
└─ Padding: Reduced

Tablet (640-1024px):
├─ Cities: 3 columns
├─ Platforms: 3 columns
└─ Standard sizing

Desktop (> 1024px):
├─ Max width: 768px centered
├─ Cities: 3 columns
└─ Full animations


═══════════════════════════════════════════════════════════════════════════════════

                              DATA PERSISTENCE

═══════════════════════════════════════════════════════════════════════════════════

localStorage['suraksha-onboarding'] = {
  state: {
    currentStep: 2,
    city: 'Mumbai',
    platform: 'Swiggy',
    hoursPerDay: 6,
    weeklyEarnings: 4200,
    riskTier: 'HIGH',
    trustScore: 80,
    weeklyPremium: 67
  },
  version: 0
}

Persists:
✓ User selections
✓ Current step position
✓ Calculated risk tier
✓ All form data

Does NOT persist:
✗ Loading states
✗ Animation states
✗ Success overlay state


═══════════════════════════════════════════════════════════════════════════════════

End of Flow Diagram
