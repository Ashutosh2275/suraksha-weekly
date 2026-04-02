# Dashboard Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
cd apps/worker-web
npm install recharts

# Run dev server
npm run dev

# Navigate to
http://localhost:3000/dashboard
```

---

## 📁 File Location

```
apps/worker-web/src/app/(app)/dashboard/page.tsx
```

---

## 🎨 Key Features at a Glance

### Status Card (Hero)
- **Shield states**: Green (ACTIVE) / Amber (EXPIRING) / Red (LAPSED)
- **Animated glow**: Active shield pulses every 2 seconds
- **Renew button**: Appears when < 48 hours remaining

### Alert Banner
- **Shows when**: Active trigger event in worker's zone
- **Types**: Rain 🌧️ / Heat 🔥 / AQI 💨
- **Action**: "Check Status →" link

### Cards Grid
1. **Protected Earnings**: Amount + ratio bar
2. **Stats**: Hours, alerts, 4-week sparkline
3. **Last Payout**: Details or empty state
4. **Quick Actions**: Renew, Policy, Support

### Mobile Nav
- **4 tabs**: Home / Claims / Payouts / Profile
- **Active indicator**: Slides with smooth spring animation

---

## 🎬 Animations

| Element | Effect | Duration |
|---------|--------|----------|
| Shield | Drop-shadow pulse | 2s loop |
| Renew button | Scale entrance | 200ms |
| Alert banner | Slide down | 300ms |
| Coverage bar | Width fill | 1s |
| Tab indicator | Position slide | Spring |

---

## 📊 Mock Data Quick Edit

Edit protection status:

```typescript
// Line 28 in page.tsx
protectionStatus: 'ACTIVE'    // Green shield
protectionStatus: 'EXPIRING'  // Amber + renew button
protectionStatus: 'LAPSED'    // Red shield
```

Toggle alert banner:

```typescript
// Line 33 in page.tsx
hasActiveTrigger: true   // Banner visible
hasActiveTrigger: false  // Banner hidden
```

Test empty payout state:

```typescript
// Line 35 in page.tsx
lastPayout: null  // Shows empty state
```

---

## 🎨 Color States

### Shield Colors
```typescript
ACTIVE   → #00C896 (emerald) + glow
EXPIRING → #F5A623 (amber)
LAPSED   → #E53535 (red)
```

### Badge Variants
```typescript
variant="accent"   // Green - COMPLETED payout
variant="warning"  // Amber - Trigger alert count > 0
variant="neutral"  // Gray - Trigger alert count = 0
```

---

## 📱 Responsive Breakpoints

```typescript
lg:grid-cols-2       // Desktop: 2 columns (≥1024px)
grid-cols-1          // Mobile: 1 column
lg:hidden            // Bottom nav: mobile only
pb-20 lg:pb-8        // Page padding for nav
```

---

## 🔌 Production API Mapping

```typescript
// Replace WORKER_DATA with:
const status = await fetch('/api/worker/status');
const stats = await fetch('/api/worker/stats');
const payout = await fetch('/api/worker/payouts/last');
const triggers = await fetch('/api/triggers/active');
```

---

## 🐛 Quick Troubleshooting

**Charts not showing?**
```bash
npm install recharts
```

**Animations broken?**
```bash
npm install framer-motion
```

**Shield not glowing?**
→ Check `protectionStatus === 'ACTIVE'`

**Bottom nav not sticky?**
→ Ensure parent has no `overflow-hidden`

---

## 🎯 Navigation Routes

```typescript
/dashboard         // Dashboard home (current)
/claims            // Claims list (bottom nav)
/payouts           // Payout history (bottom nav)
/profile           // User profile (bottom nav)
/renew             // Renewal flow (quick action)
/policy            // Policy details (quick action)
/support           // Support chat (quick action)
```

---

## 📚 Full Documentation

- **DASHBOARD_DOCS.md** - Component breakdown, animations, states
- **DASHBOARD_SETUP.md** - Installation, testing, optimization
- **DASHBOARD_COMPLETE.md** - Summary, checklist, next steps

---

## ✅ Quick Checklist

- [ ] Install Recharts: `npm install recharts`
- [ ] Run dev server: `npm run dev`
- [ ] Test ACTIVE status (green glow)
- [ ] Test EXPIRING status (renew button)
- [ ] Test alert banner
- [ ] Test empty payout state
- [ ] Test mobile bottom nav
- [ ] Verify sparkline chart
- [ ] Check responsive layout

---

**Ready in 5 minutes.** ⚡
