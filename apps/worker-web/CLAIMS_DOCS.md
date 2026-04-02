# Claims Page - Documentation

## 📍 Location
`apps/worker-web/src/app/(app)/claims/page.tsx`

## 🎨 Design Overview

A timeline-based claims feed that visualizes the journey from trigger event to payout. The design emphasizes transparency and trust — showing exactly why claims were approved or rejected.

---

## 🏗️ Component Structure

### Two States

#### 1. Empty State
**When**: No claims exist
**Design**: Centered illustration with animated delivery rider under umbrella

**Illustration** (SVG Line Art):
- Umbrella: Indigo + Amber (brand colors)
- Rider: Simple stick figure holding umbrella
- Rain drops: Falling animation (1.5s loop)
- **Animations**:
  - All paths animate in sequence (pathLength 0 → 1)
  - Rain drops fade and fall continuously
  - Total sequence: ~2 seconds

**Content**:
- Heading: "No claims yet" (Sora, 2xl, semibold)
- Sub-text: "When a weather or disruption event triggers your coverage, your claim will appear here automatically. No action needed from you."

#### 2. Claims Feed
**When**: Claims exist
**Design**: Vertical timeline with grouped claim cards

---

## 📊 Timeline Layout

### Visual Structure
```
[Timeline dot] This Week
    │
    ├── [Claim Card 1]
    │
    ├── [Claim Card 2]
    │
[Timeline dot] Last Week
    │
    ├── [Claim Card 3]
    │
[Timeline dot] Earlier
    │
    ├── [Claim Card 4]
```

### Timeline Elements

**Vertical Line**:
- Position: Absolute left
- Width: 2px (w-0.5)
- Color: border-subtle (#F1F5F9)

**Section Dots**:
- This Week: Brand primary (indigo)
- Last Week: Text secondary (slate)
- Earlier: Text muted (gray)
- Size: 16px (w-4 h-4)

**Grouping Logic**:
```typescript
This Week: ≤ 7 days ago
Last Week: 8-14 days ago
Earlier: > 14 days ago
```

---

## 🎴 Claim Card Anatomy

### Card Structure
```
┌─ [Colored Bar]──────────────────────────────┐
│                                              │
│  [Icon] [Type]                      [Chevron]│
│         [Date]                               │
│                                              │
│  [Status Badge] [Pulse/Check]               │
│                                              │
│                               [Amount] ──────┤
│                                              │
│  ─────────── EXPANDED DETAILS ─────────────  │
│  [Event Details]                             │
│  [Eligibility Checks]                        │
│  [Decision Explanation]                      │
│  [Transaction ID / Dispute]                  │
└──────────────────────────────────────────────┘
```

### Left Edge Colored Bar

**Width**: 4px (w-1)
**Height**: Full card height
**Colors by Status**:
```typescript
INITIATED  → #4A5568 (slate)
IN_REVIEW  → #F5A623 (amber)
APPROVED   → #1B4FCC (indigo)
PAID       → #00C896 (emerald)
REJECTED   → #A0AEC0 (gray - muted)
```

### Top Row

**Event Icon**: Emoji (3xl text)
- Rain: 🌧️
- Heat: 🔥
- AQI: 💨

**Type Label**: Font-display, semibold, text-primary

**Date**: Small (sm), text-secondary, formatted "Mar 30, 02:30 PM"

**Chevron**: Rotates 180° when expanded

### Status Badge

**Plain Language Labels**:
```typescript
INITIATED  → "Checking eligibility..."
IN_REVIEW  → "Being reviewed by our team"
APPROVED   → "Approved — payout processing"
PAID       → "Paid to your UPI"
REJECTED   → "Not eligible this time"
```

**Badge Variants**:
- INITIATED: neutral (gray)
- IN_REVIEW: warning (amber)
- APPROVED: accent (indigo)
- PAID: success (emerald)
- REJECTED: neutral (gray)

**Status Indicators**:

**IN_REVIEW**: Pulsing amber dot
```typescript
animate: { opacity: [1, 0.3, 1] }
duration: 2s
repeat: Infinity
```

**PAID**: Checkmark with spring animation
```typescript
Circle background: emerald, 0.2 opacity
Path: Animates from pathLength 0 → 1
Spring physics: stiffness 300, damping 20
```

### Amount Display

**Position**: Right-aligned
**Typography**: Font-display, xl, semibold
**Format**: ₹850 (Indian locale)
**Visibility**: Hidden if amount = 0 (rejected claims)

---

## 📂 Expanded Details

### Event Details Section

**Fields**:
- Zone: "Andheri East"
- Time: "Mar 30, 02:30 PM"
- Data source: "IMD Weather Station - Andheri"

**Style**: Small text, secondary color, font-medium labels

### Eligibility Checks Section

**Checklist Items**:
Each check has 3 states:
1. **Passed** (true):
   - Green checkmark circle
   - Color: brand-accent
2. **Failed** (false):
   - X icon in circle
   - Color: text-muted
3. **Checking** (null):
   - Spinning loading circle
   - Color: brand-warning
   - Animation: 360° rotation, 2s, linear, infinite

**Example Checks**:
- "Active coverage at time of event"
- "Event severity threshold met (>50mm rainfall)"
- "Location verified in coverage zone"
- "No duplicate claims for same event"

### Decision Explanation

**Container**: Light gray background (surface-subtle), rounded, padded

**Heading**:
- REJECTED: "Why was this rejected?"
- Others: "Decision"

**Content**: Plain-language explanation in relaxed line-height

**Example (PAID)**:
> "Heavy rainfall (62mm in 3 hours) was recorded in your zone during your active coverage period. You were automatically approved for payout."

**Example (REJECTED)**:
> "The rainfall recorded (38mm) did not meet our threshold of 50mm in 3 hours. This threshold ensures we only trigger payouts for events that significantly impact delivery work."

### PAID: Transaction ID

**Display**:
- Monospace font (font-mono)
- Light background (surface-subtle)
- Copy button with icon
- Timestamp: "Paid Mar 30, 04:45 PM"

**Copy Button**:
- Icon switches: Copy → Checkmark (2s)
- Hover: background surface-subtle
- Click: Copies to clipboard

### REJECTED: Dispute Link

**Button**:
- Text: "Dispute this decision"
- Color: brand-primary (indigo)
- Icon: Right arrow
- Hover: brand-primary-hover

---

## 🎨 Status-Specific Styling

### PAID Cards

**Background**: Gradient
```css
bg-gradient-to-br from-brand-accent-light to-surface-card
```
(Subtle green tint)

**Elevation**: Card variant "elevated" (more shadow)

**Checkmark Animation**:
- Scale: 0 → 1 (spring)
- Path draws in over 0.5s
- Plays once on card load

### IN_REVIEW Cards

**Pulsing Dot**:
- 8px diameter (w-2 h-2)
- Amber color
- Opacity pulses 1 → 0.3 → 1 (2s loop)

**Standard elevation**: Default card

### REJECTED Cards

**Opacity**: 75% (opacity-75)
**Bar color**: Muted gray (#A0AEC0)
**No alarming red**: Soft styling, not punitive
**Amount**: Hidden (0)

---

## 🎬 Animations

### Empty State Sequence

| Element | Animation | Start Delay | Duration |
|---------|-----------|-------------|----------|
| Container | Fade + slide up | 0ms | 500ms |
| Umbrella left | Path draw | 200ms | 1s |
| Umbrella right | Path draw | 400ms | 1s |
| Handle | Path draw | 600ms | 600ms |
| Rider head | Scale | 1s | 300ms |
| Rider body | Path draw | 1.1s | 400ms |
| Arm 1 | Path draw | 1.2s | 300ms |
| Arm 2 | Path draw | 1.3s | 300ms |
| Leg 1 | Path draw | 1.4s | 300ms |
| Leg 2 | Path draw | 1.5s | 300ms |
| Rain drops | Fade + fall | 1.6s+ | 1.5s loop |
| Heading | Fade in | 1.8s | - |
| Text | Fade in | 2s | - |

**Total sequence**: ~2 seconds

### Claim Card Animations

**Card entrance**:
```typescript
initial: { opacity: 0, x: -20 }
animate: { opacity: 1, x: 0 }
```

**Expand/collapse**:
```typescript
layout  // Framer Motion layout animation
AnimatePresence
  initial: { height: 0, opacity: 0 }
  animate: { height: 'auto', opacity: 1 }
  exit: { height: 0, opacity: 0 }
duration: 300ms
```

**Chevron rotation**:
```typescript
animate: { rotate: isExpanded ? 180 : 0 }
duration: 200ms
```

**Checkmark (PAID)**:
```typescript
Scale: 0 → 1 (spring)
Path: pathLength 0 → 1 (500ms, 200ms delay)
```

**Pulsing dot (IN_REVIEW)**:
```typescript
opacity: [1, 0.3, 1]
duration: 2s
repeat: Infinity
```

**Loading spinner (checking)**:
```typescript
rotate: 360deg
duration: 2s
repeat: Infinity
ease: linear
```

---

## 📊 Data Structure

### Claim Object
```typescript
{
  id: 'claim-001',
  triggerEvent: {
    type: 'rain' | 'heat' | 'aqi',
    label: 'Heavy Rain',
    icon: '🌧️',
    zone: 'Andheri East',
    eventTime: '2026-03-30T14:30:00Z',
    dataSource: 'IMD Weather Station - Andheri',
  },
  status: 'PAID' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'INITIATED',
  date: '2026-03-30',
  amount: 850,
  details: {
    eligibilityChecks: [
      { item: string, passed: true | false | null },
    ],
    explanation: string,
    transactionId: string | null,
    paidAt: string | null,
    rejectionReason?: string,
  },
}
```

### Status Configuration
```typescript
const STATUS_CONFIG = {
  INITIATED: {
    label: 'Checking eligibility...',
    variant: 'neutral',
    barColor: '#4A5568',
  },
  IN_REVIEW: {
    label: 'Being reviewed by our team',
    variant: 'warning',
    barColor: '#F5A623',
  },
  APPROVED: {
    label: 'Approved — payout processing',
    variant: 'accent',
    barColor: '#1B4FCC',
  },
  PAID: {
    label: 'Paid to your UPI',
    variant: 'success',
    barColor: '#00C896',
  },
  REJECTED: {
    label: 'Not eligible this time',
    variant: 'neutral',
    barColor: '#A0AEC0',
  },
};
```

---

## 🔌 API Integration (Future)

### Endpoints to Implement

```typescript
// Get all claims for worker
GET /api/worker/claims
→ Claim[]

// Get single claim details
GET /api/worker/claims/:id
→ Claim

// Submit dispute for rejected claim
POST /api/worker/claims/:id/dispute
Body: { reason: string, evidence?: string }
→ { disputeId: string, status: 'submitted' }
```

### Production Data Flow

Replace `CLAIMS_DATA` with:
```typescript
const { data: claims } = await fetch('/api/worker/claims').then(r => r.json());
```

---

## 🎯 User Interactions

### Clickable Elements

1. **Claim Card** (entire card):
   - Action: Expand/collapse details
   - Cursor: pointer
   - Visual: Chevron rotates

2. **Copy Button** (transaction ID):
   - Action: Copy to clipboard
   - Feedback: Icon switches to checkmark (2s)
   - Event: stopPropagation (doesn't expand card)

3. **Dispute Link** (rejected claims):
   - Action: Open dispute form (future)
   - Event: stopPropagation
   - Visual: Hover color change

---

## 📱 Responsive Design

### Desktop (≥ 1024px)
- Max width: 896px (max-w-4xl)
- Full timeline visible
- Expanded details show inline

### Mobile (< 1024px)
- Full width with padding
- Timeline scales appropriately
- Cards stack vertically
- Bottom padding for nav (pb-20)

---

## ♿ Accessibility

### Implemented
- [x] Semantic HTML (h1, h2, h3, section)
- [x] Keyboard navigation (cards are buttons)
- [x] Focus indicators visible
- [x] Status communicated via text + color + icon
- [x] Transaction ID copyable via keyboard
- [x] Proper heading hierarchy

### Future Enhancements
- [ ] ARIA expanded state on cards
- [ ] ARIA live announcements for status changes
- [ ] Screen reader labels for icons
- [ ] Keyboard shortcuts (e for expand, c for copy)

---

## 🧪 Test Scenarios

### Scenario 1: Empty State
```typescript
const claims = [];
```
**Expected**:
- ✅ Umbrella illustration animates
- ✅ "No claims yet" message
- ✅ Rain drops falling continuously

### Scenario 2: PAID Claim
```typescript
status: 'PAID'
amount: 850
```
**Expected**:
- ✅ Green left bar
- ✅ Green gradient background
- ✅ Checkmark animation plays once
- ✅ Transaction ID shown with copy button
- ✅ "Paid to your UPI" badge

### Scenario 3: IN_REVIEW Claim
```typescript
status: 'IN_REVIEW'
```
**Expected**:
- ✅ Amber left bar
- ✅ Pulsing amber dot
- ✅ "Being reviewed by our team" badge
- ✅ One eligibility check showing spinner (null)

### Scenario 4: REJECTED Claim
```typescript
status: 'REJECTED'
amount: 0
```
**Expected**:
- ✅ Gray muted left bar
- ✅ 75% opacity
- ✅ Amount hidden
- ✅ "Why was this rejected?" heading
- ✅ "Dispute this decision" link shown
- ✅ At least one red X in eligibility checks

### Scenario 5: Timeline Grouping
```typescript
claims = [
  { date: '2026-03-30' },  // 3 days ago → This Week
  { date: '2026-03-28' },  // 5 days ago → This Week
  { date: '2026-02-15' },  // 40+ days ago → Earlier
]
```
**Expected**:
- ✅ Two sections: "This Week", "Earlier"
- ✅ No "Last Week" section
- ✅ Different colored timeline dots

---

## 🎨 Design Tokens Used

### Colors
```css
--color-brand-primary: #1B4FCC     /* Timeline dots, checkmarks */
--color-brand-secondary: #F5A623   /* Umbrella, status bars */
--color-brand-accent: #00C896      /* PAID bars, success checks */
--color-text-secondary: #4A5568    /* Dates, labels */
--color-text-muted: #A0AEC0        /* REJECTED bars, failed checks */
--color-surface-subtle: #EEF1FA    /* Explanation background */
--color-border-subtle: #F1F5F9     /* Timeline line */
```

### Typography
```css
--font-display: 'Sora'             /* Headings, amounts */
--font-body: 'DM Sans'             /* Body text */
--font-mono: 'JetBrains Mono'      /* Transaction IDs */
```

### Spacing
```css
--space-4: 16px   /* Card gaps */
--space-6: 24px   /* Section spacing */
--space-8: 32px   /* Card padding */
```

---

## 🚀 Performance

### Optimizations Applied
- Lazy load claim cards (only render visible)
- Conditional rendering (expanded details)
- AnimatePresence for smooth unmounting
- Event handlers with stopPropagation

### Future Optimizations
```typescript
// Virtualized list for 100+ claims
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load animations
const MotionCard = dynamic(() => import('framer-motion').then(m => m.motion.div));

// Memoize claim cards
const ClaimCard = memo(ClaimCard);
```

---

## 🔮 Next Steps

### Immediate
- [ ] Test empty state in browser
- [ ] Test all claim statuses
- [ ] Verify timeline grouping
- [ ] Test expand/collapse animations

### Short-term
- [ ] Connect to real API
- [ ] Add loading states
- [ ] Implement dispute form
- [ ] Add filtering (status, date range)
- [ ] Add search functionality

### Medium-term
- [ ] Real-time status updates
- [ ] Push notifications for status changes
- [ ] Export claim history (PDF)
- [ ] Claim analytics dashboard
- [ ] Multi-language support

---

**Built with transparency. Designed for trust.** 🛡️
