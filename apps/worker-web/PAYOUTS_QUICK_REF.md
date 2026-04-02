# Payouts Page - Quick Reference

## 🚀 Quick Start

```bash
# Recharts already installed for dashboard
cd apps/worker-web
npm run dev

# Navigate to
http://localhost:3000/payouts
```

---

## 📁 File Location

```
apps/worker-web/src/app/(app)/payouts/page.tsx
```

---

## 🎨 Page Sections

### 1. Summary Strip
- Total: ₹2,340 (Sora 700, 4xl, bold)
- Count: "Across 4 payouts"
- Bar chart: 8 weeks (Recharts)
- Indigo bars (payouts) vs gray (zero weeks)

### 2. Payout List
- Calendar icon (month + day)
- Event + location
- Amount (Sora, 2xl, indigo)
- Status badge (SUCCESS/PENDING)
- Click to expand receipt

### 3. Receipt (Expanded)
- Suraksha header with shield
- 9 detail rows (grid layout)
- Transaction ID with copy button
- Download + Share buttons

### 4. Empty State
- Animated piggy bank with shield
- 2s build-up sequence
- Falling coins (infinite loop)
- Friendly message

---

## 🎬 Key Animations

**Empty State**:
- Piggy bank builds up (2s sequence)
- Coins fall continuously
- Shield springs in

**UI**:
- Cards expand/collapse (300ms)
- Chevron rotates 180°
- Copy button: icon toggle (2s)

---

## 📊 Mock Data

**4 Payouts**:
1. Heavy Rain - ₹850 (SUCCESS)
2. Extreme Heat - ₹600 (PENDING)
3. Heavy Rain - ₹420 (SUCCESS)
4. Poor Air Quality - ₹470 (SUCCESS)

**Total**: ₹2,340

**Chart**: 8 weeks (W1-W8)

---

## 🎯 Interactive

### Expand Receipt
- Click payout card
- Shows full details
- Chevron rotates

### Copy Transaction ID
- Click copy icon
- Copies to clipboard
- Shows checkmark (2s)

### Download Receipt
- Click "Download receipt"
- Opens print dialog

### Share Receipt
- Click "Share"
- Copies text summary
- Shows alert

---

## 🧪 Quick Tests

### Test Empty State
```typescript
// Line 121
const payouts = [];
```
Result: Piggy bank animation

### Test Payout List
```typescript
const payouts = PAYOUTS_DATA;
```
Result: ₹2,340 + 4 cards + chart

### Test Expand
- Click any card
- See 9 detail rows
- Copy/download/share buttons

### Test Copy
- Expand SUCCESS payout
- Click copy button
- Icon → checkmark

---

## 📋 Receipt Details

```
Event               Heavy Rain — Andheri East
Event date          2 Apr 2026, 14:30–18:00
Hours covered       3.5 hrs
Hourly rate        ₹100 (based on your earnings)
Severity factor     1.2×
────────────────────────────────────────
Total payout       ₹850
────────────────────────────────────────
Paid to            rav***@oksbi
Transaction ID     TXN8472910365 [Copy]
Processed          2 Apr 2026, 18:47
```

---

## 🎨 Design Tokens

```css
Brand primary: #1B4FCC (amounts, chart)
Brand accent: #00C896 (shield, success)
Brand warning: #F5A623 (coin slot, pending)
Gradient: brand-primary-light → surface-card
```

---

## 📱 Responsive

```typescript
Desktop (≥1024px): Max-w-4xl, full chart
Mobile (<1024px):  Full width, stacked, pb-20
```

---

## 🔌 Production API

```typescript
// Fetch payouts
GET /api/worker/payouts
→ Payout[]

// Fetch chart data
GET /api/worker/payouts/weekly-chart?weeks=8
→ { week: string, amount: number }[]

// Download PDF
GET /api/worker/payouts/:id/receipt.pdf
→ PDF file
```

---

## 📚 Full Docs

- **PAYOUTS_DOCS.md** - Technical breakdown
- **PAYOUTS_COMPLETE.md** - Summary & checklist

---

**Ready to test in 2 minutes.** ⚡

**Route**: `/payouts`
**Dependencies**: Recharts (already installed)
