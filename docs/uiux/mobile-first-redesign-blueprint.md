# Suraksha Weekly Mobile-First Redesign Blueprint

## 1) Wireframes

### 1.1 Worker Role Screens

#### W1. Auth - Phone Entry
- Layout:
  - Header: Brand mark + trust statement
  - Body: Phone field, continue button
  - Footer: Legal links and support
- Components:
  - Input (type=tel, autoComplete=tel)
  - Primary button (full width, 44px+)
- Actions:
  - Enter phone -> Request OTP -> W2
  - Validation error -> inline message

#### W2. Auth - OTP Verify
- Layout:
  - Header with back action
  - 6-digit OTP segmented input
  - Resend timer + fallback action
- Components:
  - OTP input group
  - Secondary text action
- Actions:
  - Valid OTP -> W3 or W4
  - Invalid OTP -> error state

#### W3. Profile Completion (first-time)
- Layout:
  - Step progress
  - Minimal mandatory fields (name, city, platform)
- Components:
  - Select fields optimized for mobile
  - Submit CTA + skip optional fields
- Actions:
  - Save profile -> W4

#### W4. Worker Home
- Layout:
  - Top: policy status and trust tier
  - Mid: active trigger highlights
  - Bottom: next best action cards
  - Bottom nav fixed
- Components:
  - Policy card, trigger alert card, quick action chips
- Actions:
  - Apply claim -> W5
  - View payouts -> W8

#### W5. Claim Apply
- Layout:
  - Prefilled policy and trigger context
  - Eligibility + payout estimate
  - Confirm CTA
- Components:
  - Confirmation summary card
  - Consent checkbox
- Actions:
  - Submit claim -> W6

#### W6. Claim Status List
- Layout:
  - Segmented control: In progress | Resolved | Blocked
  - Claim cards with state tags
- Components:
  - Search/filter chips
  - Infinite list
- Actions:
  - Open detail -> W7

#### W7. Claim Detail + Appeal
- Layout:
  - Timeline + fraud tags + payout details
  - Conditional appeal section
- Components:
  - Timeline list
  - Appeal textarea + templates
- Actions:
  - Submit appeal -> success toast + updated timeline

#### W8. Payout History
- Layout:
  - Summary strip + transaction list
  - Pending/reconciled grouping
- Components:
  - Payout cards with status pill
- Actions:
  - Tap payout -> detail drawer

#### W9. Account and Support
- Layout:
  - Profile completeness
  - Security and support actions
- Components:
  - List menu + destructive logout action

### 1.2 Admin Role Screens

#### A1. Dashboard
- Layout:
  - Sticky mobile header
  - KPI cards grid
  - Charts stack on mobile, 2-column on desktop
  - Bottom nav on mobile
- Components:
  - KPI card, trend chart, status band
- Actions:
  - Drill-down to queue/triggers/fraud

#### A2. Review Queue
- Layout:
  - Sticky filters and sort
  - Priority claim cards on mobile
  - Split view on desktop (list + detail)
- Components:
  - Priority badge, decision actions
- Actions:
  - Approve/reject with reason

#### A3. Trigger Monitor
- Layout:
  - Active trigger list
  - Freshness and source confidence
- Components:
  - Trigger card, stale warning banner

#### A4. Fraud Operations
- Layout:
  - Cluster list + model health summary
- Components:
  - Cluster card with severity tag
  - Model status panel

#### A5. Audit Logs
- Layout:
  - Search + faceted filters
  - Timeline list
- Components:
  - Immutable event row

---

## 2) Design System

### 2.1 Color Palette
- Primary: #0064D2
- Primary-strong: #004FA8
- Surface: #FFFFFF
- Surface-muted: #EEF2F6
- Background: #F4F6F8
- Text-primary: #132238
- Text-secondary: #516077
- Border: #D6DDE5
- Success: #12B76A
- Warning: #F79009
- Danger: #D92D20

### 2.2 Typography
- Family: Manrope (UI), fallback Segoe UI, sans-serif
- Scale:
  - xs: 12/16
  - sm: 14/20
  - base: 16/24
  - lg: 18/28
  - xl: 20/28
  - 2xl: 24/32
  - 3xl: 30/38

### 2.3 Spacing and Radius
- 4px base scale
- Core spacing tokens: 4, 8, 12, 16, 20, 24, 32
- Radius: 8, 12, 16
- Tap target minimum: 44x44

### 2.4 Component Set
- Buttons: primary, secondary, ghost, danger
- Inputs: text, tel, OTP grouped
- Cards: neutral, actionable, metric
- Pills: success, warning, danger, neutral
- Skeletons and toasts
- Bottom navigation and sticky headers

### 2.5 State Definition
- Hover, active, focus-visible, disabled, loading
- Error styles with inline helper text
- Empty and no-results variants for lists

---

## 3) Component API (React Contract)

### 3.1 Button
- Props:
  - variant: primary | secondary | ghost | danger
  - size: sm | md
  - isLoading: boolean
  - disabled: boolean
  - onClick
- Guarantees:
  - 44px minimum height for touch safety
  - focus-visible outline for keyboard users

### 3.2 Card
- Props:
  - title?: string
  - description?: string
  - action?: ReactNode
  - className?: string
- Usage:
  - KPI containers
  - action tiles
  - detail sections

### 3.3 StatusPill
- Props:
  - label: string
  - tone: success | warning | danger | neutral

### 3.4 MobileAdminShell
- Props:
  - title: string
  - subtitle?: string
  - children
- Behavior:
  - sticky top header
  - fixed mobile bottom nav
  - desktop enhancement with inline nav

---

## 4) UX Flow Optimization

### 4.1 Worker Claim Flow
1. Home surfaces trigger and policy validity.
2. Claim form prefilled with context to avoid redundant typing.
3. Single confirmation step with clear SLA and payout estimate.
4. Post-submit timeline and next best action reduce uncertainty.

### 4.2 Admin Review Flow
1. Queue defaults to high-risk and near-SLA-expiry items.
2. Decision panel keeps evidence and actions in one viewport.
3. Mandatory reason prevents ambiguous outcomes.
4. Immediate status update and audit event feedback.

### 4.3 Reduced Friction Rules
- Remove duplicate data entry.
- Prefer defaults and context-aware suggestions.
- Keep one primary action per screen section.

---

## 5) Responsive Strategy

### 5.1 Mobile First
- Bottom nav and sticky action bars for thumb reach.
- Single-column content flow and short text blocks.
- Inline cards instead of dense tables.

### 5.2 Tablet
- Two-column composition for overview + context.
- Keep touch interactions unchanged.

### 5.3 Desktop
- Progressive enhancement: split panes, denser data views, keyboard support.
- No separate design language.

---

## 6) Edge Cases

### 6.1 Empty States
- Explain why content is empty.
- Add one clear action (for example, Refresh Queue).

### 6.2 Error States
- Human-readable message with retry.
- Preserve unsent form state.

### 6.3 Loading States
- Skeletons for cards and lists.
- Keep layout stable to prevent shifts.

### 6.4 Offline/Slow Network
- Show stale timestamp and connectivity hint.
- Queue retry-able actions where safe.

---

## 7) Prioritized Redesign Backlog

### High Priority (Critical)
- Mobile navigation and shell consistency across admin pages.
- Standardized button/input/card states with accessibility compliance.
- Claim apply and review queue flow simplification.
- Error/loading/empty states for every primary screen.

### Medium Priority (Enhancements)
- Cross-screen filter persistence.
- Advanced triage shortcuts for admin desktop.
- Improved payout and trigger data visual hierarchy.

### Low Priority (Polish)
- Motion tuning and microinteractions.
- Advanced theming and visual personalization.
- Secondary analytics storytelling widgets.

---

## 8) Starter Code Delivered

Implemented in admin-web:
- Global design tokens and accessibility defaults in app globals.
- Mobile-first admin shell with bottom navigation.
- Reusable Button, Card, and StatusPill primitives.
- Updated root landing page aligned with active routes.
- Existing PageShell re-based to new shell to avoid breakage.

Reference files:
- apps/admin-web/src/app/globals.css
- apps/admin-web/src/components/common/MobileAdminShell.tsx
- apps/admin-web/src/components/common/PageShell.tsx
- apps/admin-web/src/components/common/ui/Button.tsx
- apps/admin-web/src/components/common/ui/Card.tsx
- apps/admin-web/src/components/common/ui/StatusPill.tsx
- apps/admin-web/src/app/page.tsx
