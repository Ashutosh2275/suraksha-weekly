# Payouts Page - Documentation

## 📍 Location
`apps/worker-web/src/app/(app)/payouts/page.tsx`

## 🎨 Design Overview

Feels like a personal bank statement but warmer. Clean list with expandable receipts emphasizing reliability — every payout has a complete receipt.

---

## 🏗️ Component Breakdown

### 1. Summary Strip (Top Card)

**Design**: Elevated card with gradient background

**Total Display**:
- Label: "Total received this year" (sm, secondary)
- Amount: "₹2,340" (Sora 700, 4xl, bold, brand indigo)
- Count: "Across 4 payouts" (sm, secondary)

**Bar Chart** (Recharts):
- Data: 8 weeks of payout amounts
- Bars: Indigo (#1B4FCC)
- Zero weeks: 20% opacity (gray appearance)
- Height: 80px
- X-axis: Week labels (W1-W8)
- Border radius: Rounded tops [4, 4, 0, 0]

**Chart Data Structure**:
```typescript
[
  { week: 'W1', amount: 0 },
  { week: 'W2', amount: 470 },
  ...
]
```

---

### 2. Payout List

**Section Heading**: "Recent payouts" (Sora, lg, semibold)

**Payout Card** (collapsed):
```
┌────────────────────────────────────────┐
│ [Calendar]  Event Type · Location   [⌄]│
│   MAR       ₹850                  SUCCESS│
│   30                                     │
└────────────────────────────────────────┘
```

**Calendar Icon**:
- Size: 56px (w-14 h-14)
- Background: brand-primary-light
- Border: brand-primary
- Month: Uppercase, xs, semibold
- Day: 2xl, font-display, bold

**Center Content**:
- Event + Location: sm, text-secondary
- Amount: Sora, 2xl, semibold, brand-primary

**Right Side**:
- Status badge (SUCCESS green / PENDING amber)
- Chevron (rotates 180° on expand)

---

### 3. Receipt Expanded View

**Header**:
```
[Shield] Suraksha Weekly
         Payout Receipt
```

**Receipt Details** (CSS Grid Layout):

Grid: `grid-cols-[140px_1fr]` (label column + value column)

| Label | Value |
|-------|-------|
| Event | Heavy Rain — Andheri East |
| Event date | 2 Apr 2026, 14:30–18:00 |
| Hours covered | 3.5 hrs |
| Hourly rate | ₹100 (based on your earnings) |
| Severity factor | 1.2× |
| **Total payout** | **₹420** |
| Paid to | rav***@oksbi (mono font) |
| Transaction ID | TXN8472910365 [Copy button] |
| Processed | 2 Apr 2026, 18:47 |

**Styling**:
- Labels: sm, text-secondary
- Values: sm, font-medium, text-primary
- Total row: Border-top, bold, larger
- Paid to row: Border-top separator
- Transaction ID: Monospace font

**Copy Button**:
- Icon: Copy → Checkmark (2s)
- Hover: Gray background
- Click: Copies to clipboard, stopPropagation

**Action Buttons**:
```
[Download receipt] [Share]
```

- Download: Primary button (indigo bg, white text)
- Share: Outline button (border, hover effects)
- Both: Font-medium, rounded-lg

---

### 4. Empty State

**Illustration**: Piggy bank with shield (SVG)

**Elements**:
1. Piggy bank body (ellipse)
2. Head (circle)
3. Snout (small ellipse)
4. Nostrils (2 dots)
5. Eye (circle)
6. Ear (ellipse)
7. Legs (4 rectangles)
8. Tail (curved path)
9. Coin slot (line, amber)
10. Shield (on body, emerald)
11. Falling coins (2, animated loop)

**Animation Sequence**:
- Body scales in (0.2s delay)
- Head scales in (0.3s delay)
- Snout scales in (0.4s delay)
- Eye appears (0.5s delay)
- Ear scales in (0.6s delay)
- Legs scale in (0.7-1.0s, staggered)
- Tail draws in (1.0s delay)
- Coin slot draws in (1.2s delay)
- Shield springs in (1.4s delay)
- Coins start falling (1.5s+, infinite loop)
- Heading fades in (1.8s)
- Text fades in (2.0s)

**Content**:
- Heading: "No payouts yet" (Sora, 2xl, semibold)
- Message: "Your payouts will appear here after approved claims are processed"

---

## 🎬 Animations

### Empty State

**Piggy Bank Build-Up**:
```typescript
Body:     scale 0 → 1 (0.5s, 0.2s delay)
Head:     scale 0 → 1 (0.5s, 0.3s delay)
Snout:    scale 0 → 1 (0.3s, 0.4s delay)
Eye:      scale 0 → 1 (0.2s, 0.5s delay)
Ear:      scaleY 0 → 1 (0.3s, 0.6s delay)
Legs:     scaleY 0 → 1 (0.3s, 0.7-1.0s staggered)
Tail:     pathLength 0 → 1 (0.5s, 1.0s delay)
Coin slot: pathLength 0 → 1 (0.3s, 1.2s delay)
Shield:   scale 0 → 1 spring (0.5s, 1.4s delay)
```

**Falling Coins**:
```typescript
animate: { y: [0, 15, 0], opacity: [0, 1, 0] }
duration: 2s
repeat: Infinity
stagger: 0.5s per coin
delay: 1.5s initial
```

### Payout Cards

**Card Entrance**:
```typescript
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
```

**Expand/Collapse**:
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

---

## 📊 Data Structure

### Payout Object

```typescript
interface Payout {
  id: string;
  eventType: string;              // "Heavy Rain"
  location: string;                // "Andheri East"
  amount: number;                  // 850
  status: 'SUCCESS' | 'PENDING';
  date: string;                    // ISO date for card
  eventDate: string;               // ISO datetime
  eventEndDate: string;            // ISO datetime
  hoursCovered: number;            // 3.5
  hourlyRate: number;              // 100
  severityFactor: number;          // 1.2
  upiHandle: string;               // Masked: "rav***@oksbi"
  transactionId: string | null;
  processedAt: string | null;      // ISO datetime
}
```

### Mock Data (4 Payouts)

1. **Heavy Rain** - Andheri East - ₹850 (SUCCESS)
2. **Extreme Heat** - Central Mumbai - ₹600 (PENDING)
3. **Heavy Rain** - Bandra West - ₹420 (SUCCESS)
4. **Poor Air Quality** - Andheri East - ₹470 (SUCCESS)

**Total**: ₹2,340

---

## 🎯 User Interactions

### 1. Expand Payout Receipt
- **Trigger**: Click payout card
- **Effect**: Inline expansion (300ms)
- **Visual**: Chevron rotates 180°
- **Shows**: Full receipt with all details

### 2. Copy Transaction ID
- **Trigger**: Click copy button
- **Effect**: Copies ID to clipboard
- **Feedback**: Icon changes to checkmark (2s)
- **Behavior**: stopPropagation (doesn't collapse)

### 3. Download Receipt
- **Trigger**: Click "Download receipt" button
- **Effect**: Opens browser print dialog
- **Implementation**: `window.print()`
- **Behavior**: stopPropagation

### 4. Share Receipt
- **Trigger**: Click "Share" button
- **Effect**: Copies text summary to clipboard
- **Format**:
  ```
  Suraksha Weekly Payout Receipt
  Event: Heavy Rain — Andheri East
  Event date: 2 Apr 2026, 14:30–18:00
  Hours covered: 3.5 hrs
  Total payout: ₹850
  Transaction ID: TXN8472910365
  ```
- **Feedback**: Alert "Receipt summary copied!"
- **Behavior**: stopPropagation

---

## 📱 Responsive Design

### Desktop (≥ 1024px)
- Max width: 896px (max-w-4xl)
- Chart full width
- Receipt grid layout works well

### Mobile (< 1024px)
- Full width with padding
- Calendar icon scales appropriately
- Receipt grid stacks naturally
- Action buttons full width
- Bottom padding for nav (pb-20)

---

## ♿ Accessibility

### Implemented
- [x] Semantic HTML (h1, h2)
- [x] Keyboard navigation
- [x] Focus indicators
- [x] Status via text + color
- [x] Transaction ID copyable
- [x] Print dialog accessible

### Future Enhancements
- [ ] ARIA expanded state on cards
- [ ] Screen reader labels for chart
- [ ] Keyboard shortcut for copy (c)
- [ ] Download as actual PDF (not print)

---

## 🎨 Design Tokens Used

### Colors
```css
--color-brand-primary: #1B4FCC       /* Amount, chart bars */
--color-brand-primary-light: #E8EEFB /* Calendar bg, summary card */
--color-brand-accent: #00C896        /* Shield, checkmarks */
--color-surface-card: #FFFFFF        /* Card backgrounds */
--color-text-primary: #0D1B3E        /* Amounts, headings */
--color-text-secondary: #4A5568      /* Labels, descriptions */
--color-text-muted: #A0AEC0          /* Chart axis, helpers */
```

### Typography
```css
--font-display: 'Sora'               /* Amounts, calendar days */
--font-body: 'DM Sans'               /* Body text */
--font-mono: 'JetBrains Mono'        /* Transaction IDs, UPI */
```

### Spacing
```css
--space-3: 12px    /* Icon gaps */
--space-4: 16px    /* Card gaps */
--space-6: 24px    /* Section spacing */
--space-8: 32px    /* Card padding */
```

---

## 🧪 Test Scenarios

### Scenario 1: Empty State
```typescript
const payouts = [];
```
**Expected**:
- ✅ Piggy bank animates in
- ✅ Shield appears on piggy
- ✅ Coins fall continuously
- ✅ "No payouts yet" message

### Scenario 2: With Payouts
```typescript
const payouts = PAYOUTS_DATA; // 4 payouts
```
**Expected**:
- ✅ Summary shows ₹2,340
- ✅ "Across 4 payouts"
- ✅ Bar chart shows 8 weeks
- ✅ 4 payout cards listed

### Scenario 3: Expand Receipt (SUCCESS)
**Action**: Click payout with SUCCESS status
**Expected**:
- ✅ Card expands smoothly
- ✅ Receipt header visible
- ✅ All receipt details shown
- ✅ Transaction ID with copy button
- ✅ Processed timestamp
- ✅ Download + Share buttons

### Scenario 4: Expand Receipt (PENDING)
**Action**: Click payout with PENDING status
**Expected**:
- ✅ Card expands
- ✅ Receipt details shown
- ✅ No transaction ID row
- ✅ No processed timestamp
- ✅ Still shows event details
- ✅ Download + Share available

### Scenario 5: Copy Transaction ID
**Action**: Click copy button
**Expected**:
- ✅ ID copied to clipboard
- ✅ Icon changes to checkmark
- ✅ Reverts after 2s
- ✅ Card stays expanded

### Scenario 6: Share Receipt
**Action**: Click Share button
**Expected**:
- ✅ Text summary copied
- ✅ Alert shows confirmation
- ✅ Card stays expanded

---

## 🔌 API Integration (Future)

### Endpoints to Implement

```typescript
// Get all payouts for worker
GET /api/worker/payouts
Response: Payout[]

// Get weekly chart data
GET /api/worker/payouts/weekly-chart
Params: weeks=8
Response: { week: string, amount: number }[]

// Download receipt PDF
GET /api/worker/payouts/:id/receipt.pdf
Response: PDF file
```

### Production Data Flow

```typescript
// Fetch payouts
const { data: payouts } = await fetch('/api/worker/payouts').then(r => r.json());

// Calculate total
const total = payouts.reduce((sum, p) => sum + p.amount, 0);

// Fetch chart data
const chartData = await fetch('/api/worker/payouts/weekly-chart?weeks=8').then(r => r.json());
```

---

## 🚀 Performance

### Optimizations Applied
- Conditional rendering (empty state vs list)
- AnimatePresence for smooth unmounting
- Event handlers with stopPropagation
- Lazy state initialization

### Future Optimizations
```typescript
// Virtualized list for 100+ payouts
import { useVirtualizer } from '@tanstack/react-virtual';

// Memoize payout cards
const PayoutCard = memo(PayoutCard);

// Lazy load chart library
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart));
```

---

## 🔮 Next Steps

### Immediate
- [ ] Test empty state
- [ ] Test payout list
- [ ] Expand receipts
- [ ] Test copy/share/download

### Short-term
- [ ] Connect to API
- [ ] Add pagination (>20 payouts)
- [ ] Add filtering (date range, status)
- [ ] Generate actual PDF receipts
- [ ] Add email receipt option

### Medium-term
- [ ] Export all payouts (CSV)
- [ ] Payout analytics dashboard
- [ ] Tax summary report
- [ ] Year-end statement
- [ ] Multi-year view

---

**Built with reliability. Every payout has a receipt.** 🧾
