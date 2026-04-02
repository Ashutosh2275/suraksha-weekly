# Claims Page - Quick Reference

## 🚀 Quick Start

```bash
# Already ready - no new dependencies needed!
cd apps/worker-web
npm run dev

# Navigate to
http://localhost:3000/claims
```

---

## 📁 File Location

```
apps/worker-web/src/app/(app)/claims/page.tsx
```

---

## 🎨 Two States

### Empty State
- Animated umbrella SVG (indigo + amber)
- Delivery rider under umbrella
- Falling rain drops (loop)
- "No claims yet" message

**Test**: Line 132 → `const claims = [];`

### Claims Feed
- Timeline with grouped sections
- Expandable claim cards
- Status-specific styling

**Test**: Line 132 → `const claims = CLAIMS_DATA;`

---

## 🎴 Claim Card Quick Edit

### Status Colors (Left Bar)
```typescript
INITIATED  → #4A5568 (slate)
IN_REVIEW  → #F5A623 (amber) + pulsing dot
APPROVED   → #1B4FCC (indigo)
PAID       → #00C896 (emerald) + checkmark + green tint
REJECTED   → #A0AEC0 (muted gray) + 75% opacity
```

### Status Labels
```typescript
INITIATED  → "Checking eligibility..."
IN_REVIEW  → "Being reviewed by our team"
APPROVED   → "Approved — payout processing"
PAID       → "Paid to your UPI"
REJECTED   → "Not eligible this time"
```

---

## 📊 Timeline Grouping

```typescript
This Week:  ≤ 7 days ago   (indigo dot)
Last Week:  8-14 days ago  (slate dot)
Earlier:    > 14 days ago  (gray dot)
```

Auto-calculated from claim date vs. current date.

---

## 🎬 Key Animations

| Feature | Animation | Duration |
|---------|-----------|----------|
| Umbrella | Path draw (staggered) | 2s total |
| Rain | Fade + fall | 1.5s loop |
| Cards | Fade + slide left | 300ms |
| Expand | Height + opacity | 300ms |
| PAID check | Spring scale + path | 500ms |
| IN_REVIEW dot | Opacity pulse | 2s loop |
| Checking | Rotate 360° | 2s loop |

---

## 📦 Mock Data (3 Claims)

**Claim 1**: PAID - Heavy Rain - ₹850
**Claim 2**: IN_REVIEW - Heat Wave - ₹600
**Claim 3**: REJECTED - Moderate Rain - ₹0

Located: Lines 8-108

---

## 🎯 Interactive Elements

### Click Card
- Expands/collapses details
- Chevron rotates 180°

### Copy Button (PAID)
- Copies transaction ID
- Icon → checkmark (2s)
- Doesn't expand card

### Dispute Link (REJECTED)
- Opens dispute form (future)
- Doesn't expand card

---

## 🧪 Quick Tests

### Test Empty State
```typescript
// Line 132
const claims = [];
```

### Test PAID Card
```typescript
// Line 13
status: 'PAID' as const,
```
**Expected**: Green bar, gradient bg, checkmark

### Test IN_REVIEW Card
```typescript
// Line 33
status: 'IN_REVIEW' as const,
```
**Expected**: Amber bar, pulsing dot, spinner on check

### Test REJECTED Card
```typescript
// Line 53
status: 'REJECTED' as const,
```
**Expected**: Gray bar, 75% opacity, dispute link

---

## 📱 Responsive

```typescript
Desktop (≥1024px): Max-w-4xl, full timeline
Mobile (<1024px):  Full width, pb-20 for nav
```

---

## 🎨 Design Tokens

```typescript
Brand primary:    #1B4FCC  // Timeline dots
Brand secondary:  #F5A623  // Umbrella, IN_REVIEW
Brand accent:     #00C896  // PAID bars, checks
Text secondary:   #4A5568  // Dates, labels
Text muted:       #A0AEC0  // REJECTED bars
Surface subtle:   #EEF1FA  // Explanation bg
Border subtle:    #F1F5F9  // Timeline line
```

---

## 🔌 Production API

Replace line 132:
```typescript
// Mock
const claims = CLAIMS_DATA;

// Production
const claims = await fetch('/api/worker/claims').then(r => r.json());
```

---

## ✅ Quick Checklist

- [ ] Navigate to `/claims`
- [ ] Test empty state
- [ ] Expand a PAID card
- [ ] See checkmark animation
- [ ] Copy transaction ID
- [ ] Expand IN_REVIEW card
- [ ] See pulsing dot + spinner
- [ ] Expand REJECTED card
- [ ] See dispute link
- [ ] Test timeline grouping
- [ ] Test mobile layout

---

## 📚 Full Docs

- **CLAIMS_DOCS.md** - Technical breakdown
- **CLAIMS_COMPLETE.md** - Summary & checklist

---

**Ready to test in 2 minutes.** ⚡

**Route**: `/claims`
**No installation needed** - Framer Motion already installed
