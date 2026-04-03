# Suraksha Weekly UI Component Library

Complete UI component library built with TypeScript, Tailwind CSS, and Framer Motion.

## 📦 Components

### Button

Full-featured button with loading states, variants, and icon support.

```tsx
import { Button } from '@/components/ui'

// Primary CTA
<Button variant="primary" size="md">
  Get Coverage
</Button>

// With loading state
<Button variant="primary" loading={isSubmitting}>
  Submit Claim
</Button>

// With icon
<Button variant="amber" icon={<DollarIcon />} iconPosition="left">
  ₹12,500
</Button>

// Full width
<Button variant="secondary" fullWidth>
  View Details
</Button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger' | 'amber'`
- `size`: `'sm' | 'md' | 'lg'`
- `loading`: boolean - shows spinner, hides content
- `disabled`: boolean
- `fullWidth`: boolean
- `icon`: ReactNode
- `iconPosition`: `'left' | 'right'`

**Interactions:**
- Hover: Lifts up 1px, shadow increases
- Active: Scales to 0.97
- Loading: Content fades to opacity 0, spinner fades in

---

### Card

Container with elevation and interaction states.

```tsx
import { Card } from '@/components/ui'

// Default card
<Card padding="md">
  <h3>Policy Summary</h3>
  <p>Coverage details...</p>
</Card>

// Clickable with spring physics
<Card clickable onClick={handleClick}>
  Click me!
</Card>

// Colored variant
<Card variant="colored" colorScheme="emerald">
  Success message
</Card>

// Glass effect
<Card variant="glass">
  Translucent content
</Card>

// With link
<Card href="/policies/POL-123" clickable>
  Navigate to policy
</Card>
```

**Props:**
- `variant`: `'default' | 'elevated' | 'glass' | 'colored'`
- `colorScheme`: `'indigo' | 'amber' | 'emerald' | 'red'` (for colored variant)
- `padding`: `'none' | 'sm' | 'md' | 'lg'`
- `clickable`: boolean
- `href`: string - wraps card in Next.js Link

---

### Badge

Status indicators with optional pulsing dot.

```tsx
import { Badge } from '@/components/ui'

// Policy status
<Badge status="ACTIVE" size="md" />

// Claim status with dot
<Badge status="IN_REVIEW" dot />

// Payout status
<Badge status="PAID" size="sm" />
```

**Status Types:**
- `ACTIVE` - Emerald (policy active)
- `PAID` - Emerald (payout completed)
- `IN_REVIEW` - Amber with pulse (claim under review)
- `PENDING` - Amber (awaiting action)
- `INITIATED` - Amber with pulse (process started)
- `APPROVED` - Indigo (claim approved)
- `REJECTED` - Red (claim rejected)
- `LAPSED` - Gray (policy expired)

**Props:**
- `status`: BadgeStatus (required)
- `size`: `'sm' | 'md'`
- `dot`: boolean - shows indicator dot
- Pulse automatically enables for `IN_REVIEW` and `INITIATED` when dot is true

---

### Input

Text input with label, error, prefix/suffix support.

```tsx
import { Input } from '@/components/ui'

// Basic input
<Input 
  label="Mobile Number" 
  placeholder="Enter mobile" 
/>

// With error (triggers shake animation)
<Input 
  label="Amount"
  error="Amount must be between ₹1,000 and ₹50,000"
  value={amount}
/>

// With prefix/suffix
<Input 
  label="Policy Amount"
  prefix={<span>₹</span>}
  suffix={<span>per year</span>}
/>

// With helper text
<Input 
  label="Email"
  helper="We'll never share your email"
/>
```

**Props:**
- `label`: string
- `error`: string - red border, shake animation, error message with X icon
- `helper`: string - gray helper text below input
- `prefix`: ReactNode - positioned absolute left
- `suffix`: ReactNode - positioned absolute right
- `size`: `'sm' | 'md' | 'lg'`
- All standard HTML input props

**Features:**
- iOS-safe font size (minimum 16px to prevent zoom)
- Focus ring with brand color
- Shake animation on error
- Prefix/suffix positioned absolutely to avoid layout shift

---

### OTPInput

6-digit OTP input with auto-advance.

```tsx
import { OTPInput } from '@/components/ui'

const [otp, setOtp] = useState('')

<OTPInput 
  length={6}
  value={otp}
  onChange={setOtp}
  onComplete={(code) => verifyOTP(code)}
  error={hasError}
/>
```

**Props:**
- `length`: number (default 6)
- `value`: string
- `onChange`: (otp: string) => void
- `error`: boolean - red borders, shake animation
- `onComplete`: (otp: string) => void - called when all digits filled

**Features:**
- Auto-advance on digit entry
- Paste support - spreads 6 digits across inputs
- Backspace moves to previous input
- Arrow keys navigate
- Spring scale animation on focus
- Filled state shows indigo background

---

### Skeleton

Loading placeholders with shimmer animation.

```tsx
import { Skeleton } from '@/components/ui'

// Text lines
<Skeleton variant="text" lines={3} />

// Circle (avatar)
<Skeleton variant="circle" width={48} height={48} />

// Button placeholder
<Skeleton variant="button" />

// Full card skeleton
<Skeleton variant="card" height={200} />
```

**Props:**
- `variant`: `'text' | 'circle' | 'card' | 'button'`
- `width`: string | number
- `height`: string | number
- `lines`: number (for text variant)

**Shimmer Animation:**
```css
background: linear-gradient(90deg, #EEF2FF 25%, #E2E8F4 50%, #EEF2FF 75%)
background-size: 200% 100%
animation: shimmer 1.8s ease-in-out infinite
```

---

### AmountDisplay

Formatted currency display with count-up animation.

```tsx
import { AmountDisplay } from '@/components/ui'

// Static amount
<AmountDisplay amount={12500} size="lg" />

// Animated count-up
<AmountDisplay 
  amount={totalPayout} 
  size="hero" 
  animate 
/>

// Without rupee symbol
<AmountDisplay amount={5000} showRupee={false} />
```

**Props:**
- `amount`: number (in rupees)
- `size`: `'sm' | 'md' | 'lg' | 'hero'`
- `showRupee`: boolean (default true)
- `animate`: boolean - counts up from 0

**Features:**
- Indian number format: 1,00,000
- Rupee symbol 80% size, amber color
- Hero size uses indigo color
- Smooth easing animation (1.2s duration)

---

### StatusBar

Progress bar for coverage period tracking.

```tsx
import { StatusBar } from '@/components/ui'

<StatusBar 
  start={new Date('2024-01-01')}
  end={new Date('2024-12-31')}
  colorScheme="indigo"
/>
```

**Props:**
- `start`: Date
- `end`: Date
- `colorScheme`: `'indigo' | 'amber' | 'emerald'`

**Features:**
- Shows days remaining
- Fills based on elapsed time
- Turns amber when < 20% remaining
- Spring animation on mount
- Displays start/end dates in Indian format

---

## 🎨 Design Tokens

All components use design tokens from `styles/tokens.css`:

**Colors:**
- `--brand-indigo` - Primary brand color
- `--brand-amber` - Earnings, warmth
- `--brand-emerald` - Success, safety
- `--brand-red` - Danger, errors

**Typography:**
- `--font-display` (Sora) - Headings
- `--font-body` (DM Sans) - Body text
- `--font-mono` (JetBrains Mono) - Policy IDs, amounts

**Spacing:**
- `--space-1` through `--space-20` (4px to 80px)

**Shadows:**
- `--shadow-sm/md/lg` - Elevation
- `--shadow-brand/amber/emerald` - Colored glows

---

## 🚀 Usage

Import from barrel export:

```tsx
import { 
  Button, 
  Card, 
  Badge, 
  Input, 
  OTPInput, 
  Skeleton, 
  AmountDisplay, 
  StatusBar 
} from '@/components/ui'
```

All components:
- Built with TypeScript
- Styled with Tailwind CSS
- Animated with Framer Motion
- Use `'use client'` directive
- Export type definitions

---

## 🎯 Animation Patterns

### Button
- Hover: `translateY(-1px)`, shadow increases
- Tap: `scale(0.97)`
- Loading: Content fades out (opacity 0, scale 0.8), spinner fades in

### Card
- Hover: `translateY(-2px)`, shadow increases
- Tap: `scale(0.98)`
- Spring physics: `stiffness: 300, damping: 20`

### Badge
- Pulse: Scale [1, 1.5, 1], opacity [0.75, 0, 0.75], 2s infinite

### Input
- Error: Shake animation `translateX([-4, 4, -4, 4, 0])`, 0.4s
- Focus: Border color transition, ring appears

### OTPInput
- Focus: `scale(1.05)` with spring easing
- Error: All 6 boxes shake simultaneously

### Skeleton
- Shimmer: Background position sweeps -200% to 200%, 1.8s infinite

### AmountDisplay
- Count-up: Eases from 0 to amount, 1.2s cubic-bezier

### StatusBar
- Fill: Width animates with spring physics, 0.8s

---

## 📱 Mobile Optimizations

- Inputs use minimum 16px font size (prevents iOS zoom)
- Touch targets minimum 44px height
- Spring animations for native feel
- Reduced motion support via Framer Motion

---

## ♿ Accessibility

- Semantic HTML elements
- Proper focus states
- ARIA labels where needed
- Keyboard navigation support
- Screen reader friendly
