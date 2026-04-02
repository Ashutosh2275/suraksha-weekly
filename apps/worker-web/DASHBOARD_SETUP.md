# Dashboard Setup Guide

## 📦 Installation

### Required Package

```bash
cd apps/worker-web
npm install recharts
```

*Note: framer-motion is already installed from previous auth/onboarding work*

---

## 🚀 Running the Dashboard

### Development Server

```bash
cd apps/worker-web
npm run dev
```

Navigate to: `http://localhost:3000/dashboard`

---

## 📁 File Structure

```
apps/worker-web/
├── src/
│   ├── app/
│   │   ├── (app)/                    # Authenticated app routes
│   │   │   ├── layout.tsx            # App layout wrapper
│   │   │   └── dashboard/
│   │   │       └── page.tsx          # ✨ Dashboard home page
│   │   ├── (auth)/                   # Auth routes
│   │   │   ├── page.tsx              # Login
│   │   │   └── onboarding/
│   │   │       └── page.tsx          # Onboarding wizard
│   │   └── globals.css               # Global styles
│   └── components/
│       └── ui/                        # Design system components
│           ├── Button.tsx
│           ├── Card.tsx
│           ├── Badge.tsx
│           └── ...
├── styles/
│   └── tokens.css                     # Design tokens
└── tailwind.config.js                 # Tailwind config
```

---

## 🧩 Component Dependencies

### UI Components Used

```typescript
import { Card, Badge, Button } from '@/components/ui';
```

**Required**:
- `Card` - For all 4 cards in grid
- `Badge` - For status badges (trigger alerts, payout status)
- `Button` - Quick actions (currently using plain buttons)

### External Libraries

```typescript
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
```

**Recharts**: Sparkline chart for coverage history  
**Framer Motion**: Animations (shield glow, transitions)

---

## 🎨 Design Tokens

All design tokens are automatically available via Tailwind utilities:

### Colors
```tsx
className="bg-surface-inverse"     // #0D1B3E (navy)
className="text-brand-primary"     // #1B4FCC (indigo)
className="bg-brand-secondary"     // #F5A623 (amber)
className="text-brand-accent"      // #00C896 (emerald)
```

### Typography
```tsx
className="font-display"           // Sora
className="font-body"              // DM Sans (default)
className="font-mono"              // JetBrains Mono
```

### Spacing
```tsx
className="space-4"                // 16px
className="space-6"                // 24px
className="p-8"                    // 32px (Card lg padding)
```

---

## 📊 Mock Data

### Current Implementation

All data is currently mocked in `WORKER_DATA` object:

```typescript
const WORKER_DATA = {
  name: 'Ravi',
  protectionStatus: 'ACTIVE',
  coverageEndsDate: 'Friday, 6 Apr',
  protectedAmount: 1500,
  weeklyAverage: 4200,
  // ... more fields
};
```

### Production Integration

Replace with API calls:

```typescript
// Fetch worker status
const status = await fetch('/api/worker/status').then(r => r.json());

// Fetch stats
const stats = await fetch('/api/worker/stats').then(r => r.json());

// Fetch last payout
const lastPayout = await fetch('/api/worker/payouts/last').then(r => r.json());

// Check active triggers
const triggers = await fetch('/api/triggers/active').then(r => r.json());
```

---

## 🎭 Interactive Features

### Status Card Animations

**Shield Glow** (when ACTIVE):
```typescript
animate={{
  filter: [
    'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
    'drop-shadow(0 0 16px rgba(0, 200, 150, 0.8))',
    'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
  ]
}}
transition={{ duration: 2, repeat: Infinity }}
```

**Renew Button** (appears when < 48h remaining):
```typescript
initial={{ scale: 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
whileHover={{ scale: 1.05 }}
```

### Alert Banner

Conditionally rendered based on `hasActiveTrigger`:

```typescript
{WORKER_DATA.hasActiveTrigger && (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
  >
    {/* Alert content */}
  </motion.div>
)}
```

### Bottom Navigation

**Active tab tracking**:
```typescript
const [activeTab, setActiveTab] = useState('home');
```

**Smooth indicator animation**:
```typescript
<motion.div
  layoutId="activeTab"
  className="absolute top-0 w-1 h-1 rounded-full bg-brand-primary"
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
/>
```

---

## 📱 Responsive Behavior

### Desktop (≥ 1024px)
- 2-column card grid
- No bottom navigation
- Horizontal status card layout

### Mobile (< 1024px)
- 1-column card grid
- Fixed bottom navigation (4 tabs)
- Page padding-bottom: 80px (nav height)
- Stacked status card layout

### Breakpoint Classes

```tsx
className="grid grid-cols-1 lg:grid-cols-2"    // Grid
className="flex-col lg:flex-row"               // Status card
className="lg:hidden"                          // Bottom nav (mobile only)
className="pb-20 lg:pb-8"                      // Page padding
```

---

## 🧪 Testing Scenarios

### Scenario 1: Active Protection
```typescript
protectionStatus: 'ACTIVE'
hasActiveTrigger: true
```

**Expected**:
- ✅ Green glowing shield
- ✅ Alert banner visible
- ✅ No renew button (>48h)
- ✅ Stats populated

### Scenario 2: Expiring Soon
```typescript
protectionStatus: 'EXPIRING'
daysRemaining: 2  // calculated
```

**Expected**:
- ✅ Amber shield
- ✅ Renew button visible
- ✅ "Coverage expiring soon" text

### Scenario 3: First Week (No Payouts)
```typescript
lastPayout: null
```

**Expected**:
- ✅ Empty state with cloud ☁️
- ✅ "No payouts yet..." message

### Test Status Changes

Edit `WORKER_DATA.protectionStatus`:
```typescript
'ACTIVE'   → Green shield, glowing
'EXPIRING' → Amber shield, renew button
'LAPSED'   → Red shield, no glow
```

---

## ⚡ Performance Tips

### Optimize Re-renders

```typescript
import { memo, useMemo } from 'react';

// Memoize calculations
const coverageRatio = useMemo(
  () => (protectedAmount / weeklyAverage) * 100,
  [protectedAmount, weeklyAverage]
);

// Memoize expensive components
const SparklineChart = memo(({ data }) => (
  <ResponsiveContainer>...</ResponsiveContainer>
));
```

### Lazy Load Charts

```typescript
import dynamic from 'next/dynamic';

const SparklineChart = dynamic(
  () => import('./components/SparklineChart'),
  { ssr: false }
);
```

---

## ♿ Accessibility Checklist

- [x] Keyboard navigation for all interactive elements
- [x] Focus indicators visible
- [x] Color not sole indicator of status (icons + text)
- [x] Touch targets ≥ 44px (mobile nav)
- [x] Semantic HTML (proper heading hierarchy)
- [ ] ARIA labels for charts (future)
- [ ] Screen reader announcements for status changes (future)

---

## 🎯 Navigation Flow

```
/                         → Auth page (phone + OTP)
  ↓ (after OTP)
/onboarding              → 4-step wizard
  ↓ (after activation)
/dashboard               → Dashboard home ✨ YOU ARE HERE
  ↓ (bottom nav)
/claims                  → Claims list
/payouts                 → Payout history
/profile                 → User profile

Quick actions:
  - Renew Plan      → /renew
  - View Policy     → /policy
  - Contact Support → /support
```

---

## 🐛 Troubleshooting

### Charts Not Rendering

**Issue**: Recharts not installed

**Fix**:
```bash
cd apps/worker-web
npm install recharts
```

### Animations Not Working

**Issue**: Framer Motion not installed

**Fix**:
```bash
cd apps/worker-web
npm install framer-motion
```

### Shield Icon Not Showing

**Issue**: SVG path not rendering

**Check**: Ensure `fill` and `stroke` attributes are using `currentColor`

### Bottom Nav Not Sticky

**Issue**: Mobile nav not fixed

**Check**: Ensure parent div doesn't have `overflow-hidden`

---

## 🔮 Next Steps

### Immediate
1. Install Recharts: `npm install recharts`
2. Test in browser: `npm run dev`
3. Verify all animations working
4. Test responsive layout

### Short-term
- Connect to real API endpoints
- Add loading states
- Implement error boundaries
- Add skeleton screens

### Medium-term
- Build Claims page (`/claims`)
- Build Payouts page (`/payouts`)
- Build Profile page (`/profile`)
- Add notifications system

---

## 📚 Related Documentation

- [DASHBOARD_DOCS.md](./DASHBOARD_DOCS.md) - Full component breakdown
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Design tokens reference
- [ONBOARDING_DOCS.md](./ONBOARDING_DOCS.md) - Onboarding flow
- [AUTH_SCREEN_DOCS.md](./AUTH_SCREEN_DOCS.md) - Authentication flow

---

**Ready to protect your workers.** 🛡️
