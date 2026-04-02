# Worker Dashboard - Documentation

## 📍 Location
`apps/worker-web/src/app/(app)/dashboard/page.tsx`

## 🎨 Design Overview

A warm, personal financial companion dashboard that shows workers their protection status at a glance. Card-heavy layout with smooth animations and real-time status updates.

---

## 🏗️ Component Breakdown

### Header / Hero Section

#### Greeting
```tsx
"Good morning, Ravi 👋"
Current date: "Monday, Apr 2"
```

**Logic**: 
- Morning: < 12pm
- Afternoon: 12pm - 5pm
- Evening: > 5pm

#### Large Status Card
**Design**: Full-width navy background with grid pattern texture

**Layout**:
```
[Shield Icon] [Status Text] [Renew Button]
     Left         Center          Right
```

**Shield Icon**:
- **ACTIVE**: Glowing green with pulsing animation
- **EXPIRING**: Amber glow
- **LAPSED**: Red, no glow

**Status Text**:
- Title: "You're protected this week" (Sora 600, white)
- Subtitle: "Coverage ends Friday, 6 Apr · ₹1,500 protected"

**Renew Button**:
- Only shown when < 48 hours remaining
- Amber background
- Appears with scale animation

**Animated Features**:
- Grid pattern background (static)
- Shield glow animation (2s loop, infinite)
- Renew button entrance (scale + opacity)

---

### Alert Banner

**Trigger**: Shows only when active event detected

**Design**:
- Full-width amber background
- 4px left border (amber)
- Pulsing border animation

**Content**:
```
[Icon] Heavy rain detected in Andheri East — you may be eligible for a payout [Check Status →]
```

**Icons by Type**:
- Rain: 🌧️
- Heat: 🔥
- AQI: 💨

**Animation**: Icon scales 1 → 1.1 → 1 (2s loop)

---

### Content Grid

**Layout**: 2 columns desktop, 1 column mobile

#### Card 1: Protected Earnings

**Content**:
- Label: "Protected this week"
- Amount: ₹1,500 (5xl, Sora, brand indigo)
- Context: "Based on your ₹4,200 weekly average"
- Coverage ratio bar

**Coverage Bar**:
- Shows: Protected / Weekly Average %
- Gradient: Indigo → Emerald
- Animates width on load (1s delay)

**Calculation**:
```typescript
coverageRatio = (protectedAmount / weeklyAverage) * 100
Example: (1500 / 4200) * 100 = 36%
```

---

#### Card 2: This Week's Stats

**Stats Display**:
```
Hours covered:    42 hrs
Active since:     Monday
Trigger alerts:   0 (badge)
```

**Sparkline Chart** (Recharts):
- Data: 4-week coverage history
- Type: Line chart
- Color: Brand indigo
- Height: 64px (h-16)
- No dots, smooth line

**Data Structure**:
```typescript
coverageHistory: [
  { week: 'W1', amount: 1200 },
  { week: 'W2', amount: 1400 },
  { week: 'W3', amount: 1300 },
  { week: 'W4', amount: 1500 },
]
```

---

#### Card 3: Last Payout

**Two States**:

**1. With Payout**:
```
₹850              [COMPLETED]
12 Mar · Heavy Rain

Paid directly to your account
```

- Amount: 3xl, Sora, emerald
- Date + event type
- Status badge (accent variant)
- Footer note

**2. Empty State**:
```
      ☁️
No payouts yet — we hope it stays that way!
```

- Large cloud illustration
- Muted text
- Centered layout

**Action**: "View all →" link in header

---

#### Card 4: Quick Actions

**3 Action Buttons**:
1. 🔄 Renew Plan
2. 📄 View Policy
3. 💬 Contact Support

**Button Design**:
- Full width
- Icon + Label + Chevron
- Border default → brand on hover
- Background white → light indigo on hover
- Smooth transitions

---

### Bottom Navigation (Mobile Only)

**4 Tabs**:
1. 🏠 Home (active)
2. 📋 Claims
3. 💰 Payouts
4. 👤 Profile

**Active State**:
- Indigo dot above icon
- Full opacity icon
- Brand indigo text
- Smooth slide animation (layoutId)

**Inactive State**:
- 50% opacity icon
- Muted text

**Animation**: Active indicator slides between tabs using Framer Motion layoutId

---

## 🎨 Visual States

### Protection Status

| Status | Shield Color | Glow | Text |
|--------|-------------|------|------|
| ACTIVE | Emerald | Green pulsing | "You're protected this week" |
| EXPIRING | Amber | Amber glow | "Coverage expiring soon" |
| LAPSED | Red | None | "Coverage has lapsed" |

### Alert Banner States

```typescript
hasActiveTrigger: true
  → Banner visible with slide-down animation
  
hasActiveTrigger: false
  → Banner hidden
```

### Trigger Event Types

```typescript
rain: 🌧️ "Heavy rain detected..."
heat: 🔥 "Heat wave detected..."
aqi: 💨 "Poor air quality detected..."
```

---

## 📊 Data Flow

### Mock Data Structure

```typescript
WORKER_DATA = {
  name: 'Ravi',
  protectionStatus: 'ACTIVE' | 'EXPIRING' | 'LAPSED',
  coverageEndsDate: 'Friday, 6 Apr',
  protectedAmount: 1500,
  weeklyAverage: 4200,
  hoursCovered: 42,
  activeSince: 'Monday',
  triggerAlerts: 0,
  
  hasActiveTrigger: boolean,
  triggerEvent: {
    type: 'rain' | 'heat' | 'aqi',
    location: 'Andheri East',
    message: string,
  },
  
  lastPayout: {
    amount: 850,
    date: '12 Mar',
    eventType: 'Heavy Rain',
    status: 'COMPLETED',
  } | null,
  
  coverageHistory: [
    { week: 'W1', amount: number },
    ...
  ],
}
```

**Production**: Would fetch from API endpoints:
- `/api/worker/status`
- `/api/worker/stats`
- `/api/worker/payouts/last`
- `/api/triggers/active`

---

## 🎬 Animations

### Shield Glow (Active Status)
```typescript
animate: {
  filter: [
    'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
    'drop-shadow(0 0 16px rgba(0, 200, 150, 0.8))',
    'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
  ]
}
duration: 2s
repeat: infinite
```

### Renew Button Entrance
```typescript
initial: { scale: 0.9, opacity: 0 }
animate: { scale: 1, opacity: 1 }
whileHover: { scale: 1.05 }
```

### Alert Banner
```typescript
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
```

### Coverage Ratio Bar
```typescript
initial: { width: 0 }
animate: { width: '36%' }
duration: 1s
delay: 0.2s
```

### Active Tab Indicator
```typescript
layoutId: "activeTab"
transition: { type: 'spring', stiffness: 300, damping: 30 }
```

---

## 📱 Responsive Design

### Desktop (>= 1024px)
- 2-column grid for cards
- Max width: 1152px (max-w-6xl)
- No bottom navigation
- Full card layouts

### Tablet (640px - 1024px)
- 2-column grid (smaller gaps)
- Adjusted padding
- No bottom navigation

### Mobile (< 640px)
- 1-column grid
- Full-width cards
- Bottom navigation visible
- Fixed bottom nav (80px height)
- Page padding-bottom: 80px

---

## 🎯 User Interactions

### Clickable Elements

1. **Renew Button**:
   - Action: Navigate to `/renew`
   - Condition: Shows when < 48h remaining

2. **Check Status** (Alert Banner):
   - Action: Navigate to `/claims/check`
   - Opens claim eligibility flow

3. **View All Payouts**:
   - Action: Navigate to `/payouts`
   - Shows payout history

4. **Quick Actions**:
   - Renew Plan → `/renew`
   - View Policy → `/policy`
   - Contact Support → `/support`

5. **Bottom Nav Tabs**:
   - Home → `/dashboard`
   - Claims → `/claims`
   - Payouts → `/payouts`
   - Profile → `/profile`

---

## 🎨 Design Tokens Used

### Colors
```typescript
surface-inverse: #0D1B3E (status card)
surface-card: #FFFFFF (main cards)
surface-base: #F7F8FC (page background)
brand-primary: #1B4FCC (text, bars)
brand-secondary: #F5A623 (renew button)
brand-accent: #00C896 (shield, payout)
brand-warning: #F5A623 (alert banner)
indigo-200: #C7D2FE (subtitle text)
```

### Typography
```typescript
Headings: font-display (Sora)
  - Greeting: 3xl, semibold
  - Status: 2xl-3xl, semibold
  - Amount: 5xl, bold

Body: font-body (DM Sans)
  - Labels, descriptions
  - Stats, helper text

Mono: font-mono (JetBrains Mono)
  - Currency amounts in text
```

### Spacing
```typescript
Section padding: py-6, py-8
Card padding: p-8 (lg variant)
Grid gap: gap-6
Content gap: gap-4, space-y-4
```

### Shadows & Effects
```typescript
shadow-card: Default cards
shadow-lg: Renew button
Grid pattern: 20px × 20px, 10% opacity
```

---

## 🧪 Test Scenarios

### Scenario 1: Active Protection
```typescript
protectionStatus: 'ACTIVE'
hasActiveTrigger: true
lastPayout: exists
```
**Expected**:
- Green glowing shield
- Alert banner visible
- Payout card shows last payment
- Renew button hidden (>48h)

### Scenario 2: Expiring Soon
```typescript
protectionStatus: 'EXPIRING'
daysRemaining: 2
```
**Expected**:
- Amber shield
- Renew button visible
- "Coverage expiring soon" text

### Scenario 3: Lapsed Coverage
```typescript
protectionStatus: 'LAPSED'
```
**Expected**:
- Red shield, no glow
- "Coverage has lapsed" text
- Prominent renew CTA

### Scenario 4: First Week (No Payouts)
```typescript
lastPayout: null
```
**Expected**:
- Empty state with cloud
- Encouraging message
- "View all" link still present

---

## 📦 Dependencies

### Required Packages

```json
{
  "recharts": "^2.x",        // Sparkline chart
  "framer-motion": "^10.x",  // Animations
  "react": "^18.3.1"         // Core
}
```

### Installation

```bash
cd apps/worker-web
npm install recharts
```

*Note: framer-motion already installed for onboarding*

---

## ♿ Accessibility

### Screen Readers
- Status card announces protection state
- Alert banner uses role="alert"
- Stats properly labeled
- Button labels descriptive

### Keyboard Navigation
- All buttons focusable
- Tab order logical
- Focus indicators visible
- Bottom nav keyboard accessible

### Color Contrast
- All text meets WCAG AA
- Status colors distinguishable
- Icons supplement color coding

---

## 🚀 Performance

### Optimizations
- Lazy load Recharts
- Memoize calculation functions
- Debounce tab switches
- Optimize re-renders

### Metrics
- **First Load**: < 2s
- **Interactive**: < 1s
- **Chart Render**: < 200ms
- **Tab Switch**: < 100ms

---

## 🔮 Future Enhancements

- [ ] Real-time trigger notifications
- [ ] Pull-to-refresh on mobile
- [ ] Swipe gestures for cards
- [ ] Detailed coverage breakdown
- [ ] Weekly summary email option
- [ ] Referral rewards section
- [ ] Achievement badges
- [ ] Personalized tips
- [ ] Weather forecast integration
- [ ] Earnings predictions

---

**Built with trust. Designed for protection.** 🛡️
