# Suraksha Weekly Design System

**Visual Identity:** The warm, trustworthy shield — protection you can feel

## Quick Reference

### 🎨 Brand Colors

```tsx
// Indigo (Trust & Stability)
bg-brand-indigo          // #1B4FCC - Primary brand color
bg-brand-indigo-dark     // #1440A8 - Hover states
bg-brand-indigo-light    // #EEF2FF - Subtle backgrounds

// Amber (Earnings & Energy)
bg-brand-amber           // #F5A623 - Earnings highlights
bg-brand-amber-dark      // #D4891A - Hover states
bg-brand-amber-light     // #FEF6E4 - Subtle backgrounds

// Emerald (Success & Safety)
bg-brand-emerald         // #00C896 - Success states
bg-brand-emerald-light   // #E6FAF5 - Subtle backgrounds

// Red (Alerts & Danger)
bg-brand-red             // #E53535 - Danger states
bg-brand-red-light       // #FEF0F0 - Subtle backgrounds
```

### 🖼️ Surfaces

```tsx
bg-surface-page          // #F4F7FD - Page background
bg-surface-card          // #FFFFFF - Card backgrounds
bg-surface-card-hover    // #FAFBFF - Card hover state
bg-surface-dark          // #0D1B3E - Dark surfaces
bg-surface-dark-2        // #162040 - Darker variant
bg-surface-subtle        // #EEF2FF - Subtle sections
```

### ✍️ Typography

**Fluid Typography** - Automatically scales between mobile and desktop:

```tsx
// Classes (use these in components)
text-xs      // 11-12px
text-sm      // 13-14px
text-base    // 15-16px (body text)
text-lg      // 17-18px
text-xl      // 19-20px
text-2xl     // 22-24px
text-3xl     // 26-30px
text-4xl     // 30-36px
text-hero    // 36-48px (hero headings)
```

**Font Families:**

```tsx
font-display   // Sora - for headings (geometric, trustworthy)
font-body      // DM Sans - for body text (warm, readable)
font-mono      // JetBrains Mono - for policy IDs, amounts
```

### 🎭 Text Colors

```tsx
text-text-primary    // #0D1B3E - Primary text
text-text-secondary  // #4A5878 - Secondary labels
text-text-muted      // #8B96AF - Hints, placeholders
text-text-inverse    // #FFFFFF - On dark backgrounds
text-text-brand      // #1B4FCC - Links, accents
text-text-amber      // #B87D10 - Amber text
```

### 📦 Spacing

```tsx
space-1   // 4px
space-2   // 8px
space-3   // 12px
space-4   // 16px (base)
space-5   // 20px
space-6   // 24px
space-8   // 32px
space-10  // 40px
space-12  // 48px
space-16  // 64px
space-20  // 80px
```

### 🔲 Border Radius

```tsx
rounded-sm   // 8px  - Buttons, inputs
rounded-md   // 12px - Cards (default)
rounded-lg   // 16px - Large cards
rounded-xl   // 24px - Hero sections
rounded-2xl  // 32px - Modals
rounded-full // 9999px - Pills, avatars
```

### 💫 Shadows

```tsx
shadow-sm       // Subtle elevation
shadow-md       // Standard cards (default)
shadow-lg       // Modals, dropdowns
shadow-brand    // Brand-colored glow
shadow-amber    // Amber glow
shadow-emerald  // Emerald glow
```

### ⚡ Transitions

```tsx
transition-fast    // 150ms - Quick interactions
transition-base    // 250ms - Standard (default)
transition-slow    // 400ms - Smooth animations
transition-spring  // 500ms - Bouncy, playful
```

### 🎨 Usage Examples

#### Card Component
```tsx
<div className="bg-surface-card rounded-lg shadow-md p-6 hover:shadow-lg transition-base">
  <h3 className="font-display text-2xl text-text-primary">
    Policy Coverage
  </h3>
  <p className="font-body text-base text-text-secondary mt-2">
    You're protected with comprehensive coverage
  </p>
</div>
```

#### CTA Button
```tsx
<button className="
  bg-brand-indigo hover:bg-brand-indigo-dark 
  text-text-inverse font-display 
  px-6 py-3 rounded-md 
  shadow-brand hover:shadow-lg
  transition-base
">
  Get Started
</button>
```

#### Earnings Highlight
```tsx
<div className="bg-brand-amber-light rounded-lg p-4 border-2 border-brand-amber">
  <span className="font-mono text-2xl text-text-amber">₹12,450</span>
  <p className="text-sm text-text-secondary mt-1">This Week's Earnings</p>
</div>
```

#### Policy ID Display
```tsx
<code className="font-mono text-sm bg-surface-subtle px-3 py-1 rounded-sm">
  POL-2024-AHD-1234
</code>
```

## 🚀 Next.js Font Setup

Add to `src/app/layout.tsx`:

```tsx
import { Sora, DM_Sans, JetBrains_Mono } from 'next/font/google'

const sora = Sora({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sora',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
})

const jetBrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

## 📐 Design Principles

1. **Warmth Over Coldness** - Use rounded corners, soft shadows, warm colors
2. **Trust Through Clarity** - Clean typography, clear hierarchy, no jargon
3. **Protection You Can Feel** - Generous whitespace, calm colors, smooth animations
4. **Gig Worker First** - Mobile-optimized, thumb-friendly, quick interactions

## 🎯 Color Usage Guide

- **Indigo** - Primary actions, navigation, links, trust signals
- **Amber** - Earnings, money-related, energy, warmth
- **Emerald** - Success states, payouts, safety confirmations
- **Red** - Danger, errors, fraud alerts, destructive actions

## 🔧 Custom Utilities

```css
.transition-fast   → 150ms cubic-bezier
.transition-base   → 250ms cubic-bezier
.transition-slow   → 400ms cubic-bezier
.transition-spring → 500ms with spring easing
.animate-shake     → Shake animation for errors
```

---

**Files Updated:**
- `styles/tokens.css` - All CSS custom properties and base styles
- `src/app/globals.css` - Tailwind layers and utilities
- `tailwind.config.ts` - Tailwind theme extension
- `src/components/ui/` - Ready for UI components
