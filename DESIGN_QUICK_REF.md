# Suraksha Design System — Quick Reference

## 🎨 Colors

### Brand
```tsx
bg-brand-primary           // #1B4FCC Deep indigo (trust, CTAs)
bg-brand-secondary         // #F5A623 Warm amber (earnings)
bg-brand-accent            // #00C896 Emerald (success, payouts)
bg-brand-danger            // #E53535 Red (alerts, fraud)
bg-brand-warning           // #F5A623 Amber (warnings)
```

### Text
```tsx
text-text-primary          // #0D1B3E Deep navy (main text)
text-text-secondary        // #4A5568 Slate (labels)
text-text-muted            // #A0AEC0 Gray (hints)
text-text-inverse          // #FFFFFF White (on dark)
text-text-accent           // #1B4FCC Indigo (links)
```

### Surface
```tsx
bg-surface-base            // #F7F8FC Off-white (page)
bg-surface-card            // #FFFFFF White (cards)
bg-surface-subtle          // #EEF1FA Light indigo (sections)
bg-surface-inverse         // #0D1B3E Dark navy (hero)
```

## 📝 Typography

```tsx
font-display               // Sora — headings
font-body                  // DM Sans — body text
font-mono                  // JetBrains Mono — data/code

text-xs text-sm text-base text-lg text-xl 
text-2xl text-3xl text-4xl text-5xl

font-normal font-medium font-semibold font-bold
```

## 📏 Spacing

```tsx
p-1 p-2 p-3 p-4 p-5 p-6 p-8 p-10 p-12 p-16 p-20
m-1 m-2 m-3 m-4 m-5 m-6 m-8 m-10 m-12 m-16 m-20
gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 gap-8 gap-10 gap-12 gap-16 gap-20

// 1=4px 2=8px 3=12px 4=16px 5=20px 6=24px 8=32px 10=40px 12=48px 16=64px 20=80px
```

## 🔲 Radius & Shadows

```tsx
rounded-sm                 // 8px
rounded-md                 // 12px
rounded-lg                 // 16px
rounded-xl                 // 24px
rounded-full               // 9999px

shadow-card                // Subtle card elevation
shadow-elevated            // Modal/dropdown
shadow-brand               // CTA glow
```

## 🧩 Components

### Button
```tsx
<Button variant="primary" size="md" isLoading={false}>
  Submit
</Button>
// primary | secondary | accent | danger | ghost | outline
// sm | md | lg
```

### Card
```tsx
<Card variant="elevated" padding="md">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

### Badge
```tsx
<Badge variant="accent" size="md">Active</Badge>
// primary | secondary | accent | danger | warning | neutral
```

### Input
```tsx
<Input 
  label="Phone" 
  placeholder="+91 98765 43210"
  error={errors.phone}
  helperText="We'll never share"
  leftIcon={<Icon />}
/>
```

### Select
```tsx
<Select 
  label="Type"
  options={[
    { value: 'health', label: 'Health' },
    { value: 'accident', label: 'Accident' }
  ]}
/>
```

### Modal
```tsx
<Modal isOpen={open} onClose={close} title="Confirm" size="md">
  <p>Content</p>
  <ModalFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Confirm</Button>
  </ModalFooter>
</Modal>
```

### Skeleton
```tsx
<Skeleton variant="rectangular" width={300} height={200} />
<SkeletonText lines={3} />
<SkeletonCard />
```

## 📦 Import

```tsx
import { Button, Card, Badge, Input, Select, Modal, Skeleton } from '@/components/ui';
```

## 🎯 Common Patterns

### Earnings Card
```tsx
<Card variant="elevated">
  <CardContent>
    <span className="font-mono text-5xl font-bold text-brand-secondary">
      ₹2,450
    </span>
    <Badge variant="accent">+12%</Badge>
  </CardContent>
</Card>
```

### Form Field
```tsx
<Input
  label="Amount"
  type="number"
  placeholder="₹5,000"
  leftIcon={<RupeeIcon />}
  error={errors.amount}
  helperText="Minimum ₹500"
/>
```

### Status Badge
```tsx
<Badge variant="accent">Approved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Rejected</Badge>
```

### Action Row
```tsx
<div className="flex gap-3">
  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
  <Button variant="primary" isLoading={loading}>Confirm</Button>
</div>
```

---

**📖 Full docs:** `apps/*/styles/README.md`  
**🎨 Brand:** Protection, trust, warmth — like a reliable umbrella 🛡️
