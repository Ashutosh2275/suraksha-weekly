# Suraksha Weekly - Login/Splash Page

**Location:** `apps/worker-web/src/app/(auth)/page.tsx`

## Overview

Full-screen immersive entry point that feels like "walking into safety." The page is split into a dramatic dark navy hero section and a clean white form panel.

## Layout Structure

### Mobile (< 1024px)
- **Hero Section:** Top 55vh
- **Form Panel:** Bottom 45vh, slides up with rounded top corners

### Desktop (≥ 1024px)
- **Hero Section:** Left 45% of viewport
- **Form Panel:** Right 55% of viewport

---

## Hero Section

### Background
```css
Background: #0D1B3E (surface-dark)
Radial gradients:
  - Ellipse at 30% 50%: rgba(27,79,204,0.4) → transparent
  - Ellipse at 70% 30%: rgba(0,200,150,0.15) → transparent
```

### Animated Elements

**1. Floating Circles (Pure CSS)**
- 3 circles: 100px, 60px, 40px diameter
- Indigo fill with 6% opacity
- Float animation: vertical oscillation over 6-10s
- Staggered delays: 0s, 2s, 4s

**2. Grid Pattern**
- 1px lines at 40px intervals
- Color: rgba(255,255,255,0.03)
- Background pattern overlay

**3. Shield Icon**
- 80×80px SVG
- Linear gradient fill: indigo → indigo-dark
- Outer stroke: rgba(255,255,255,0.15)
- **Pulsing Rings:** 3 concentric rings scale outward (1 → 2) and fade, 2s loop
- **Entrance:** Scales from 0.5 to 1 with spring bounce on page load

### Content

**Wordmark:**
```tsx
"Suraksha" - Sora 700, 28px, white
"Weekly" - Sora 400, 28px, rgba(255,255,255,0.6)
```

**Tagline:**
```
"Income protection for delivery partners"
DM Sans, 14px, rgba(255,255,255,0.5)
```

**Rotating Value Props:**
Cycles every 3.5s with crossfade animation:
1. "When rain stops deliveries — we pay you."
2. "Auto-payout in minutes. No claim forms."
3. "Trusted by 10,000+ delivery partners."

Each message:
- Fades out: opacity 0, translateY -8px
- Fades in: from translateY 8px to 0
- Duration: 0.5s

---

## Form Panel

### Phone Input State

**Heading:**
```
"Enter your mobile number" - Sora 600, 22px
"We'll send a 6-digit code to verify" - DM Sans, 14px, muted
```

**Phone Input:**
- Height: 56px (h-14)
- Border radius: 12px
- Font: 18px Sora (iOS-safe)
- **Prefix:** 🇮🇳 flag + "+91" in gray pill
- **Format:** Auto-adds space after 5 digits: "98765 43210"
- **Focus:** Indigo border + shadow `[0_0_0_3px_rgba(27,79,204,0.12)]`

**Send OTP Button:**
- Height: 52px
- Full width
- Brand indigo background
- Arrow icon (→) slides right 4px on hover
- Loading state: "Sending..." text

### OTP Verification State

**Transition:**
- Phone input slides up and out
- OTP boxes slide up from below (staggered 40ms each)

**Heading:**
```
"Enter the code sent to"
"+91 98765 43210"
```

**OTP Boxes:**
- 6 individual inputs
- Size: 11×14 (w-11 h-14)
- Font: 24px bold Sora
- Border: 2px
- **Default:** Gray border
- **Filled:** Indigo border + light indigo background
- **Focus:** Scale 1.05 with spring easing + indigo shadow
- **Error:** Red border + light red background + shake animation

**Auto-advance:**
- Moves to next box on digit entry
- Backspace moves to previous if current is empty
- Paste support: spreads 6 digits across all boxes

**Resend Timer:**
- "Resend in 0:45" countdown
- When 0: becomes "Resend OTP" link

**Error State:**
```
"Incorrect code. X attempts remaining."
- All 6 boxes shake
- Red borders + red backgrounds
- Error message slides in below
```

**Success State:**
- All boxes turn emerald green
- Brief 500ms animation
- Redirect to /dashboard

---

## Animations

### Page Load Sequence (Staggered)
1. **0ms:** Shield icon scales in with spring bounce
2. **150ms:** Wordmark fades up
3. **250ms:** Tagline fades up  
4. **300ms:** Value props fade up
5. **400ms:** Form panel slides up from below (spring easing)

### Interactions

**Send OTP Button:**
- Hover: Arrow slides right 4px (spring transition)
- Loading: Text changes to "Sending..."

**OTP Inputs:**
- Focus: Scale 1.05 + indigo shadow
- Error: Shake animation (all 6 boxes simultaneously)
- Stagger in: Each box delays 40ms on mount

**Value Props:**
- Every 3.5s: Current fades out (-8px), next fades in (+8px)
- Smooth crossfade, 500ms duration

---

## Error Handling

### Phone Errors
- Empty/invalid: "Please enter a valid 10-digit mobile number"
- Displays below input with X icon

### OTP Errors
- Incomplete: "Please enter all 6 digits"
- Wrong code: "Incorrect code. X attempts remaining."
- Shake animation on all boxes
- Red borders + backgrounds
- Error message with X icon

---

## Accessibility

- Semantic HTML (`<form>`, `<label>`, `<button>`)
- ARIA labels for screen readers
- Focus management (auto-focus on inputs)
- Keyboard navigation (Tab, Backspace, Arrow keys)
- Error announcements (`role="alert"`, `aria-live="polite"`)
- iOS-safe font size (18px minimum)

---

## Mobile Optimizations

- Rounded top corners (24px) on mobile form panel
- Slides up over hero section
- Input type="tel" with inputMode="numeric"
- Touch-friendly 56px input height
- Auto-format phone number with space for readability

---

## Desktop Layout

- Hero: Left 45% full height
- Form: Right 55% full height
- No rounded corners on form panel
- Grid pattern more visible
- Larger floating circles

---

## Demo Credentials

**OTP Code:** `123456`

Any other code will trigger error state with attempt counter.

---

## Files Structure

```
apps/worker-web/src/app/(auth)/
├── layout.tsx          # Auth layout wrapper
└── page.tsx           # Login/splash page (this file)
```

---

## Key Features

✅ Full-screen immersive design
✅ Animated hero section with floating elements
✅ Pulsing shield icon with rings
✅ Rotating value propositions
✅ Auto-formatted phone input
✅ OTP auto-advance with paste support
✅ Smooth state transitions
✅ Error states with shake animations
✅ Responsive mobile/desktop layouts
✅ Spring physics animations
✅ Accessibility compliant

---

## Testing

1. **Phone Input:**
   - Enter 10 digits
   - Format should show space after 5 digits
   - Error on invalid length

2. **OTP Verification:**
   - Should auto-advance on digit entry
   - Paste "123456" should fill all boxes
   - Wrong code triggers shake + error
   - Correct code (123456) redirects to /dashboard

3. **Resend Timer:**
   - Starts at 45 seconds
   - Counts down
   - Becomes clickable link at 0

4. **Animations:**
   - Page loads with staggered entrance
   - Value props rotate every 3.5s
   - Shield has pulsing rings
   - Floating circles move smoothly
