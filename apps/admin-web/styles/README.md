# Suraksha Weekly Design System

A comprehensive design system for Suraksha Weekly — protection and trust for gig workers.

## Brand Identity

**Suraksha** means "protection" in Hindi. Our visual language embodies:
- **Trustworthy**: Deep indigo primary color conveys stability and reliability
- **Warm**: Amber accents bring energy and approachability
- **Modern**: Clean typography and generous spacing feel contemporary
- **Confident**: Like the calm confidence of a reliable umbrella on a rainy day

## 🎨 Usage

### Importing Design Tokens

Add the tokens to your app's main CSS file:

```css
/* In your app/globals.css or styles.css */
@import '../styles/tokens.css';
```

### Using Tailwind Utilities

The Tailwind config extends all design tokens as utilities:

```tsx
// Brand colors
<div className="bg-brand-primary text-text-inverse">Primary Action</div>
<div className="bg-brand-secondary">Earnings Section</div>
<div className="bg-brand-accent">Success State</div>

// Typography
<h1 className="font-display text-4xl">Heading</h1>
<p className="font-body text-base text-text-secondary">Body text</p>
<code className="font-mono">POL-2024-001</code>

// Spacing & Layout
<div className="p-6 space-y-4">
  <div className="rounded-lg shadow-card">Card</div>
</div>
```

### UI Components

Import components from `components/ui`:

```tsx
import { Button, Card, Badge, Input } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Details</CardTitle>
        <CardDescription>Review your upcoming payout</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Badge variant="accent">Approved</Badge>
        <Input 
          label="Amount" 
          placeholder="₹5,000"
          leftIcon={<RupeeIcon />}
        />
      </CardContent>
      
      <CardFooter>
        <Button variant="primary">Process Payout</Button>
      </CardFooter>
    </Card>
  );
}
```

## 📦 Components

### Button
Variants: `primary` | `secondary` | `accent` | `danger` | `ghost` | `outline`  
Sizes: `sm` | `md` | `lg`

```tsx
<Button variant="primary" size="md" isLoading={false}>
  Submit
</Button>
```

### Card
Variants: `default` | `elevated` | `subtle`  
Padding: `none` | `sm` | `md` | `lg`

```tsx
<Card variant="elevated" padding="lg">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

### Badge
Variants: `primary` | `secondary` | `accent` | `danger` | `warning` | `neutral`  
Sizes: `sm` | `md`

```tsx
<Badge variant="accent" size="md">Active</Badge>
```

### Input
Props: `label`, `error`, `helperText`, `leftIcon`, `rightIcon`

```tsx
<Input 
  label="Phone Number"
  placeholder="+91 98765 43210"
  error={errors.phone}
  helperText="We'll never share your number"
  leftIcon={<PhoneIcon />}
/>
```

### Select
Props: `label`, `error`, `helperText`, `options`

```tsx
<Select
  label="Policy Type"
  options={[
    { value: 'health', label: 'Health Insurance' },
    { value: 'accident', label: 'Accident Coverage' }
  ]}
/>
```

### Skeleton
Variants: `text` | `circular` | `rectangular`

```tsx
<Skeleton variant="rectangular" width={300} height={200} />
<SkeletonText lines={3} />
<SkeletonCard />
```

### Modal
Sizes: `sm` | `md` | `lg` | `xl`

```tsx
<Modal 
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Payout"
  description="Are you sure you want to proceed?"
  size="md"
>
  <p>Payout details...</p>
  <ModalFooter>
    <Button variant="outline" onClick={handleClose}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </ModalFooter>
</Modal>
```

## 🎨 Color Palette

### Brand Colors
- **Primary** (`#1B4FCC`): Trust, stability — primary CTAs
- **Secondary** (`#F5A623`): Earnings, energy — highlights
- **Accent** (`#00C896`): Success, safety — positive states
- **Danger** (`#E53535`): Alerts, errors — critical actions
- **Warning** (`#F5A623`): Caution — warnings

### Surface Colors
- **Base** (`#F7F8FC`): Page background
- **Card** (`#FFFFFF`): Card surfaces
- **Subtle** (`#EEF1FA`): Subtle sections
- **Inverse** (`#0D1B3E`): Dark hero sections

### Text Colors
- **Primary** (`#0D1B3E`): Main text
- **Secondary** (`#4A5568`): Secondary labels
- **Muted** (`#A0AEC0`): Hints, placeholders
- **Inverse** (`#FFFFFF`): Text on dark backgrounds
- **Accent** (`#1B4FCC`): Links, active states

## 📝 Typography

### Font Families
- **Display** (Sora): Headings — geometric, trustworthy
- **Body** (DM Sans): Body text — warm, readable
- **Mono** (JetBrains Mono): Policy IDs, amounts

### Usage Guidelines
```tsx
// Headings
<h1 className="font-display text-4xl font-semibold">Main Heading</h1>

// Body
<p className="font-body text-base">Regular paragraph text</p>

// Data/Code
<code className="font-mono text-sm">POL-2024-001</code>
<span className="font-mono text-lg">₹25,000</span>
```

## 📏 Spacing Scale

Based on 8px grid:
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px
- `space-10`: 40px
- `space-12`: 48px
- `space-16`: 64px
- `space-20`: 80px

## 🔲 Border Radius
- `radius-sm`: 8px — Buttons, inputs
- `radius-md`: 12px — Cards
- `radius-lg`: 16px — Large cards
- `radius-xl`: 24px — Hero sections
- `radius-full`: Full circle — Avatars, badges

## 🌓 Shadows
- `shadow-card`: Subtle card elevation
- `shadow-elevated`: Modals, dropdowns
- `shadow-brand`: CTA buttons with brand glow

## 🚀 Getting Started

1. **Import tokens** in your main CSS file
2. **Use Tailwind utilities** for rapid development
3. **Use components** for consistent UI patterns
4. **Follow brand guidelines** for color and typography

## 📚 Examples

### Worker Dashboard Card
```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Today's Earnings</CardTitle>
    <CardDescription>Across all platforms</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-5xl font-bold text-brand-secondary">
        ₹2,450
      </span>
      <Badge variant="accent">+12%</Badge>
    </div>
  </CardContent>
</Card>
```

### Payout Form
```tsx
<form className="space-y-6">
  <Input
    label="Amount"
    type="number"
    placeholder="Enter amount"
    leftIcon={<RupeeIcon />}
    helperText="Minimum ₹500"
  />
  
  <Select
    label="Account"
    options={accounts}
    helperText="Linked bank accounts"
  />
  
  <Button variant="primary" fullWidth isLoading={isSubmitting}>
    Request Payout
  </Button>
</form>
```

---

**Built with trust. Designed for protection.** 🛡️
