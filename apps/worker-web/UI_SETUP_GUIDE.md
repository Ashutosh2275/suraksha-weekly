# UI Component Library - Setup Instructions

## ✅ Components Created

All components have been built and are located in `src/components/ui/`:

- ✅ Button.tsx - Full-featured button with loading, variants, icons
- ✅ Card.tsx - Container with variants and interactions
- ✅ Badge.tsx - Status indicators with pulsing dot
- ✅ Input.tsx - Text input with prefix/suffix, error states
- ✅ OTPInput.tsx - 6-digit OTP with auto-advance
- ✅ Skeleton.tsx - Loading placeholders with shimmer
- ✅ AmountDisplay.tsx - Formatted currency with count-up animation
- ✅ StatusBar.tsx - Progress bar for coverage periods
- ✅ index.ts - Barrel export for all components

## 📦 Required Dependencies

**Framer Motion** is required but not yet installed. Install it:

```bash
cd apps/worker-web
npm install framer-motion
```

## 🎨 Design System Updates

The following files have been updated:

1. **styles/tokens.css** - Enhanced with:
   - New color tokens (brand-indigo, brand-amber, brand-emerald, brand-red)
   - Fluid typography using clamp()
   - Enhanced shadows (brand, amber, emerald glows)
   - Updated text colors and borders

2. **src/app/globals.css** - Added:
   - Typography utilities (text-xs through text-hero)
   - Font family utilities (font-display, font-body, font-mono)
   - Transition utilities (transition-fast/base/slow/spring)
   - Updated base styles for headings

3. **tailwind.config.ts** - Extended with:
   - All design tokens as Tailwind utilities
   - Shimmer animation keyframes
   - Fluid font sizes
   - Custom spacing, shadows, and colors

## 🚀 Next Steps

### 1. Install Framer Motion

```bash
cd apps/worker-web
npm install framer-motion
```

### 2. Update layout.tsx with Fonts

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

### 3. Test the Components

Create a test page to verify all components work:

```tsx
// app/test-ui/page.tsx
'use client'

import { 
  Button, 
  Card, 
  Badge, 
  Input, 
  OTPInput, 
  Skeleton, 
  AmountDisplay, 
  StatusBar 
} from '@/components/ui'

export default function TestUIPage() {
  return (
    <div className="p-8 space-y-8">
      <h1>UI Component Library Test</h1>
      
      <section>
        <h2>Buttons</h2>
        <div className="flex gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="amber">Amber</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>Loading</Button>
        </div>
      </section>
      
      <section>
        <h2>Cards</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>Default Card</Card>
          <Card variant="elevated">Elevated</Card>
          <Card variant="glass">Glass</Card>
          <Card variant="colored" colorScheme="indigo">Colored</Card>
        </div>
      </section>
      
      <section>
        <h2>Badges</h2>
        <div className="flex gap-3">
          <Badge status="ACTIVE" />
          <Badge status="IN_REVIEW" dot />
          <Badge status="PAID" />
          <Badge status="REJECTED" />
        </div>
      </section>
      
      <section>
        <h2>Input</h2>
        <Input label="Name" placeholder="Enter your name" />
        <Input 
          label="Amount" 
          error="This field is required" 
          prefix={<span>₹</span>}
        />
      </section>
      
      <section>
        <h2>OTP Input</h2>
        <OTPInput />
      </section>
      
      <section>
        <h2>Skeleton</h2>
        <Skeleton variant="text" lines={3} />
      </section>
      
      <section>
        <h2>Amount Display</h2>
        <AmountDisplay amount={125000} size="hero" animate />
      </section>
      
      <section>
        <h2>Status Bar</h2>
        <StatusBar 
          start={new Date('2024-01-01')}
          end={new Date('2024-12-31')}
        />
      </section>
    </div>
  )
}
```

## 📚 Documentation

- **DESIGN_SYSTEM_QUICK_REF.md** - Design system tokens and usage
- **UI_LIBRARY_DOCS.md** - Complete component API documentation

## 🎯 Key Features

All components include:

✅ TypeScript with full type definitions
✅ Tailwind CSS styling using design tokens
✅ Framer Motion animations (once installed)
✅ Responsive and mobile-optimized
✅ Accessibility features
✅ Consistent design language
✅ Error states and loading states
✅ Indian number formatting for amounts
✅ Spring physics for natural feel

## 🐛 Troubleshooting

If you see errors about `framer-motion`:
1. Make sure you've installed it: `npm install framer-motion`
2. Restart your dev server: `npm run dev`

If animations don't work:
1. Check that components are client components (`'use client'`)
2. Verify Framer Motion is installed
3. Check browser console for errors

If styles don't apply:
1. Verify `globals.css` is imported in `layout.tsx`
2. Check that `tailwind.config.ts` paths include `src/components/**`
3. Restart dev server to pick up config changes

## ✨ Ready to Use!

Once Framer Motion is installed, all components are production-ready and can be imported like:

```tsx
import { Button, Card, Badge } from '@/components/ui'
```
