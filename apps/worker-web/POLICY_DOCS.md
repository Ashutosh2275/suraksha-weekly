# Policy Detail Page - Documentation

## 📍 Location
`apps/worker-web/src/app/(app)/policy/page.tsx`

## 🎨 Design Overview

A premium "certificate" aesthetic policy document that's mobile-native and scannable. Feels official but warm, with clean typography and bordered sections.

---

## 🏗️ Component Breakdown

### 1. Policy Certificate Card

**Design**: Premium bordered card (4px indigo top border)

**Header Row**:
```
[Suraksha Logo + Name]           [ACTIVE Badge]
POL-2026-04-001-MUM
```

**Logo**: Shield SVG (indigo, 32px)
**Policy ID**: Monospace font, muted text
**Status Badge**: Large pill (success variant)

**Two-Column Grid**:

| Left Column | Right Column |
|-------------|--------------|
| Policy Period<br/>"Mon 1 Apr – Sun 7 Apr 2026" | Coverage Limit<br/>"Up to ₹1,500" |
| Premium Paid<br/>"₹67" | Zones Covered<br/>[Pills: Andheri East, Bandra West...] |

**Zone Pills**:
- Background: brand-primary-light
- Text: brand-primary
- Rounded-full, px-3 py-1

---

### 2. Coverage Details Section

**Heading**: "What's covered" (Sora, 2xl, semibold)

**Trigger Cards** (3-5 cards):

Each card contains:
- **Animated SVG icon** (48x48)
- **Trigger name** (font-display, semibold)
- **Threshold description** (plain language)
- **Status chip**:
  - Active: Green badge
  - Waiting: Amber badge with hours remaining

#### Animated Icons

**Rain Icon**:
- Cloud shape (indigo, 20% opacity)
- 3 rain drop lines
- Animation:
  - Cloud fades in
  - Drops animate up/down (1.2s loop, staggered)

**Heat Icon**:
- Thermometer outline (amber)
- Bulb at bottom
- Mercury column rises (1s animation, repeats every 3s)
- Heat waves float right (2s loop)

**AQI Icon**:
- 3 cloud circles (gray, staggered)
- 5 floating particles
- Animation:
  - Circles fade in (staggered)
  - Particles float up and fade (3s loop)

**Status Chips**:
- Active: `<Badge variant="success">Active</Badge>`
- Waiting: `<Badge variant="warning">Waiting period: 18 hours remaining</Badge>`

---

### 3. What's NOT Covered - Accordion

**Trigger Button**:
- Full width card
- "What's NOT covered" heading
- Chevron (rotates 180° on expand)
- Hover: border changes to brand-primary

**Expanded Content**:
- 4 exclusion cards
- Each with:
  - Left border (4px, muted gray)
  - Light background (surface-subtle)
  - Title (font-medium, text-primary)
  - Description (sm, text-secondary)

**Exclusions**:
1. Health issues
2. Vehicle repair or maintenance
3. Planned events
4. Platform account issues

**Animation**:
```typescript
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
exit: { height: 0, opacity: 0 }
duration: 300ms
```

---

### 4. Premium Breakdown Section

**Trigger**: "Why ₹67 this week?" (expandable)

**Chevron**: Rotates 180° on expand

**Expanded Content**:

**Base Premium Row**:
```
Base premium                    ₹29
─────────────────────────────────
```

**Factor Rows** (3 examples):
```
[Icon] Factor Label           [Effect Chip] [Amount]
🌧️ Mumbai Monsoon Zone        ↑ Higher      +₹12
🏍️ Clean claim history         ↓ Lower       -₹8
⏰ Standard work hours          = Neutral     —
```

**Effect Chips**:
- **Higher**: Red bg, red text, "↑ Higher"
- **Lower**: Green bg, green text, "↓ Lower"
- **Neutral**: Gray bg, gray text, "= Neutral"

**Amount**:
- Monospace font
- Width: 48px (w-12), right-aligned
- Shows +/- or — for neutral

**Total Row**:
```
─────────────────────────────────
Total Premium                ₹67
```

Large, bold, brand-primary

---

### 5. Renewal Section

**Container**: Elevated card with gradient background

**Days Remaining**:
```
Coverage ends in 3 days          57% complete
```

**Progress Bar**:
- Height: 8px (h-2)
- Background: surface-subtle
- Fill: Gradient (indigo → emerald)
- Animation: Width 0 → X% (1s, 0.3s delay)

**Calculation**:
```typescript
const daysProgress = ((7 - daysRemaining) / 7) * 100;
// 3 days left: (7-3)/7 = 57%
```

**Renew Button**:
- Full width
- Large (py-4, text-lg)
- Brand indigo background
- White text
- Shadow
- Text: "Renew for next week — ₹67"

**Auto-Renew Toggle**:

Container: White card, bordered

**Toggle Switch**:
- Width: 48px (w-12)
- Height: 24px (h-6)
- Background: Gray (off) / Green (on)
- Knob: White circle, 16px
- Animation: Slides left/right (spring physics)

**Label + Description**:
- "Auto-renew weekly" (font-medium)
- "We'll automatically renew your coverage every Monday. You can cancel anytime." (sm, secondary)

---

## 🎬 Animations

### Icon Animations

**Rain Drops**:
```typescript
animate: { y: [0, 2, 0], opacity: [1, 1, 1] }
duration: 1.2s
repeat: Infinity
stagger: 0.2s per drop
```

**Heat Mercury**:
```typescript
initial: { height: 0, y: 32 }
animate: { height: 20, y: 12 }
duration: 1s
delay: 0.5s
repeat: Infinity
repeatDelay: 2s
```

**Heat Waves**:
```typescript
animate: { opacity: [0.5, 1, 0.5], x: [0, 3, 0] }
duration: 2s
repeat: Infinity
stagger: 0.3s per wave
```

**AQI Particles**:
```typescript
animate: { y: [0, -8, 0], opacity: [0, 0.6, 0] }
duration: 3s
repeat: Infinity
stagger: 0.4s per particle
```

### UI Animations

**Accordion Expand/Collapse**:
```typescript
AnimatePresence
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
exit: { height: 0, opacity: 0 }
duration: 300ms
```

**Chevron Rotation**:
```typescript
animate: { rotate: isExpanded ? 180 : 0 }
duration: 200ms
```

**Progress Bar Fill**:
```typescript
initial: { width: 0 }
animate: { width: '57%' }
duration: 1s
delay: 0.3s
```

**Toggle Switch Knob**:
```typescript
animate: { left: autoRenew ? '28px' : '4px' }
type: 'spring'
stiffness: 300
damping: 30
```

---

## 📊 Data Structure

### Policy Data Schema

```typescript
interface PolicyData {
  policyId: string;              // "POL-2026-04-001-MUM"
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  period: {
    start: string;               // ISO date
    end: string;                 // ISO date
  };
  coverageLimit: number;         // 1500
  premiumPaid: number;           // 67
  zones: string[];               // ["Andheri East", ...]
  
  triggers: Array<{
    id: string;
    name: string;
    icon: 'rain' | 'heat' | 'aqi';
    threshold: string;           // Plain language
    status: 'active' | 'waiting';
    waitingPeriod?: number;      // hours
  }>;
  
  exclusions: Array<{
    title: string;
    description: string;
  }>;
  
  premiumFactors: Array<{
    icon: string;                // Emoji
    label: string;
    effect: 'higher' | 'lower' | 'neutral';
    amount: number;              // Can be negative
  }>;
  
  daysRemaining: number;
  autoRenew: boolean;
}
```

### Mock Data Included

**Policy**: POL-2026-04-001-MUM
**Period**: Apr 1-7, 2026
**Coverage**: ₹1,500
**Premium**: ₹67
**Zones**: 3 (Andheri East, Bandra West, Central Mumbai)
**Triggers**: 3 (Rain: active, Heat: active, AQI: waiting 18h)
**Factors**: 3 (Monsoon +₹12, Clean history -₹8, Hours ₹0)
**Days left**: 3 (57% complete)

---

## 🎯 User Interactions

### 1. Expand/Collapse Exclusions
- **Trigger**: Click "What's NOT covered" button
- **Effect**: Accordion expands/collapses (300ms)
- **Visual**: Chevron rotates 180°
- **State**: `showExclusions` boolean

### 2. Expand/Collapse Premium Breakdown
- **Trigger**: Click "Why ₹67 this week?" button
- **Effect**: Card expands/collapses (300ms)
- **Visual**: Chevron rotates 180°
- **State**: `showPremiumBreakdown` boolean

### 3. Toggle Auto-Renew
- **Trigger**: Click toggle switch
- **Effect**: Knob slides left/right (spring)
- **Visual**: Background changes gray ↔ green
- **State**: `autoRenew` boolean
- **Future**: Would call API to update preference

### 4. Renew Button
- **Trigger**: Click "Renew for next week" button
- **Effect**: Navigate to renewal flow (future)
- **Action**: `/renew` route

### 5. Contact Support
- **Trigger**: Click "Contact Support" link
- **Effect**: Open support chat (future)
- **Action**: `/support` route

---

## 📱 Responsive Design

### Desktop (≥ 768px)
- Two-column grid in certificate card
- Icons displayed at full 48x48
- Wider max-width (max-w-4xl)

### Mobile (< 768px)
- Single column layout
- Stacked certificate fields
- Zone pills wrap
- Bottom padding for nav (pb-20)

---

## ♿ Accessibility

### Implemented
- [x] Semantic HTML (h1, h2, h3)
- [x] Keyboard navigation (all buttons focusable)
- [x] Focus indicators visible
- [x] Status communicated via text + color
- [x] Toggle switch keyboard accessible
- [x] ARIA expanded states (future)

### Future Enhancements
- [ ] aria-expanded on accordions
- [ ] aria-label for animated icons
- [ ] role="switch" for toggle
- [ ] Screen reader announcements

---

## 🎨 Design Tokens Used

### Colors
```css
--color-brand-primary: #1B4FCC       /* Border, badges, icons */
--color-brand-primary-light: #E8EEFB /* Zone pills, renewal card */
--color-brand-accent: #00C896        /* Progress bar, lower chips */
--color-brand-danger: #E53535        /* Higher chips */
--color-surface-card: #FFFFFF        /* Card backgrounds */
--color-surface-subtle: #EEF1FA      /* Exclusion cards */
--color-border: #E2E8F0             /* Card borders */
--color-text-primary: #0D1B3E        /* Headings */
--color-text-secondary: #4A5568      /* Labels */
--color-text-muted: #A0AEC0          /* Policy ID, helper text */
```

### Typography
```css
--font-display: 'Sora'               /* Headings, amounts */
--font-body: 'DM Sans'               /* Body text */
--font-mono: 'JetBrains Mono'        /* Policy ID, amounts */
```

### Spacing
```css
--space-3: 12px    /* Icon gaps */
--space-4: 16px    /* Card gaps */
--space-6: 24px    /* Section spacing */
--space-8: 32px    /* Card padding (lg) */
```

---

## 🧪 Test Scenarios

### Scenario 1: Active Policy
```typescript
status: 'ACTIVE'
daysRemaining: 3
```
**Expected**:
- ✅ Green ACTIVE badge
- ✅ Progress bar at 57%
- ✅ "Coverage ends in 3 days"
- ✅ Renew button visible

### Scenario 2: All Triggers Active
```typescript
triggers: [
  { status: 'active' },
  { status: 'active' },
  { status: 'active' },
]
```
**Expected**:
- ✅ All show green "Active" badges
- ✅ All icons animate continuously

### Scenario 3: Waiting Period Trigger
```typescript
{
  status: 'waiting',
  waitingPeriod: 18
}
```
**Expected**:
- ✅ Amber badge
- ✅ "Waiting period: 18 hours remaining"

### Scenario 4: Expand Exclusions
**Action**: Click "What's NOT covered"
**Expected**:
- ✅ Accordion expands (300ms)
- ✅ 4 exclusion cards shown
- ✅ Chevron rotates 180°

### Scenario 5: Expand Premium Breakdown
**Action**: Click "Why ₹67 this week?"
**Expected**:
- ✅ Card expands
- ✅ Base ₹29 shown
- ✅ 3 factors with effect chips
- ✅ Total ₹67 bold

### Scenario 6: Toggle Auto-Renew
**Action**: Click toggle switch
**Expected**:
- ✅ Knob slides right (spring)
- ✅ Background changes to green
- ✅ State updates to true

---

## 🔌 API Integration (Future)

### Endpoints to Implement

```typescript
// Get policy details
GET /api/worker/policy/current
Response: PolicyData

// Update auto-renew preference
PUT /api/worker/policy/auto-renew
Body: { enabled: boolean }
Response: { success: boolean }

// Renew policy
POST /api/worker/policy/renew
Response: { policyId: string, paymentUrl: string }
```

---

## 🚀 Performance

### Optimizations Applied
- Conditional rendering (accordions)
- AnimatePresence for smooth unmounting
- SVG animations (CSS, not JS)
- Lazy state initialization

### Future Optimizations
```typescript
// Memoize icon components
const RainIcon = memo(RainIcon);

// Lazy load animations
const MotionDiv = dynamic(() => import('framer-motion').then(m => m.motion.div));
```

---

## 🔮 Next Steps

### Immediate
- [ ] Test in browser
- [ ] Verify all animations
- [ ] Test accordions
- [ ] Test toggle switch

### Short-term
- [ ] Connect to API
- [ ] Implement renew flow
- [ ] Add payment integration
- [ ] Save auto-renew preference

### Medium-term
- [ ] Policy history view
- [ ] Download policy PDF
- [ ] Email policy copy
- [ ] Policy amendments

---

**Built with clarity. Designed like a premium certificate.** 📜
