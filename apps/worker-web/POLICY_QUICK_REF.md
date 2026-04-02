# Policy Page - Quick Reference

## 🚀 Quick Start

```bash
# No new dependencies needed!
cd apps/worker-web
npm run dev

# Navigate to
http://localhost:3000/policy
```

---

## 📁 File Location

```
apps/worker-web/src/app/(app)/policy/page.tsx
```

---

## 🎨 Page Sections

### 1. Policy Certificate Card
- 4px indigo top border
- Suraksha logo + policy ID
- ACTIVE badge (green)
- 2-column grid (period, coverage, premium, zones)

### 2. Coverage Details
- 3 trigger cards with animated icons:
  - Rain (drops bounce)
  - Heat (mercury rises)
  - AQI (particles float)
- Each shows threshold + status
- "What's NOT covered" accordion (4 exclusions)

### 3. Premium Breakdown
- "Why ₹67 this week?" accordion
- Base ₹29 + 3 factors = ₹67
- Effect chips (↑ Higher / ↓ Lower / = Neutral)

### 4. Renewal Section
- Progress bar (57% complete)
- "Renew for next week" button
- Auto-renew toggle (animated)

---

## 🎬 Animations

| Icon | Animation |
|------|-----------|
| Rain | Drops bounce up/down (1.2s loop) |
| Heat | Mercury rises + waves float (1-2s) |
| AQI | Particles float up (3s loop) |

| UI | Animation |
|----|-----------|
| Accordions | Height + opacity (300ms) |
| Progress | Width fill (1s, delayed) |
| Toggle | Slide spring physics |

---

## 📊 Mock Data

**Policy**: POL-2026-04-001-MUM
**Status**: ACTIVE
**Period**: Apr 1-7, 2026
**Coverage**: ₹1,500
**Premium**: ₹67
**Zones**: 3 (Andheri East, Bandra West, Central)
**Days left**: 3 (57% progress)

---

## 🎯 Interactive Elements

### Click "What's NOT covered"
- Expands 4 exclusion cards
- Chevron rotates 180°

### Click "Why ₹67 this week?"
- Shows premium breakdown
- Base + 3 factors + total

### Click Toggle Switch
- Knob slides (spring)
- Gray ↔ Green
- Auto-renew on/off

### Click "Renew for next week"
- Navigate to renewal (future)

---

## 🧪 Quick Tests

### Test Animations
- Rain drops should bounce
- Mercury should rise
- Particles should float

### Test Accordions
- Click exclusions → expands
- Click premium → shows factors
- Click again → collapses

### Test Toggle
- Click → slides right, turns green
- Click → slides left, turns gray

---

## 🎨 Effect Chips

```typescript
Higher: Red bg, "↑ Higher", +₹12
Lower:  Green bg, "↓ Lower", -₹8
Neutral: Gray bg, "= Neutral", —
```

---

## 📱 Responsive

```typescript
Desktop (≥768px): 2-column grid
Mobile (<768px):  Single column stack
```

---

## 🔄 State Management

```typescript
const [showExclusions, setShowExclusions] = useState(false);
const [showPremiumBreakdown, setShowPremiumBreakdown] = useState(false);
const [autoRenew, setAutoRenew] = useState(false);
```

---

## 🎨 Design Tokens

```css
Border: 4px indigo top
Icons: Indigo rain, Amber heat, Gray AQI
Badges: Green active, Amber waiting
Progress: Indigo → Emerald gradient
Toggle: Gray off, Green on
```

---

## 🔌 Production API

```typescript
// Fetch policy
GET /api/worker/policy/current

// Update auto-renew
PUT /api/worker/policy/auto-renew
Body: { enabled: boolean }
```

---

## 📚 Full Docs

- **POLICY_DOCS.md** - Technical breakdown
- **POLICY_COMPLETE.md** - Summary & checklist

---

**Ready to test in 2 minutes.** ⚡

**Route**: `/policy`
**No new dependencies needed**
