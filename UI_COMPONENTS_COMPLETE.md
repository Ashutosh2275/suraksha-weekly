# Suraksha Weekly UI Component Library

## Overview
A comprehensive, production-ready UI component library built for the Suraksha Weekly micro-insurance platform. All components are fully typed with TypeScript, include Framer Motion animations, and follow the established design system.

## Components Available

### Core Components

#### Button
**File**: `Button.tsx`
**Features**:
- 4 variants: `primary`, `secondary`, `ghost`, `danger`
- 3 sizes: `sm` (32px), `md` (40px), `lg` (48px)
- Loading state with smooth text-to-spinner animation
- Active state scaling (0.98x)
- Full width option
- Proper focus states and accessibility

**Usage**:
```tsx
<Button variant="primary" size="md" loading={false} fullWidth={false}>
  Send OTP
</Button>
```

#### Badge  
**File**: `Badge.tsx`
**Features**:
- Status-based styling for insurance workflows: `ACTIVE`, `LAPSED`, `IN_REVIEW`, `APPROVED`, `PAID`, `REJECTED`, `CRITICAL`, `PENDING`
- Variant-based styling: `primary`, `secondary`, `accent`, `danger`, `warning`, `success`, `neutral`
- Optional dot indicator
- Pulse animation for critical states
- 2 sizes: `sm`, `md`

**Usage**:
```tsx
<Badge status="PAID" dot>₹420 paid to your UPI</Badge>
<Badge variant="primary" size="sm">Active</Badge>
```

#### Card
**File**: `Card.tsx`
**Features**:
- 4 variants: `default`, `elevated`, `outlined`, `colored`
- Color schemes: `indigo`, `amber`, `green`, `red`
- Interactive mode with hover animations
- Composition pattern with sub-components:
  - `CardHeader`
  - `CardTitle` 
  - `CardDescription`
  - `CardContent`
  - `CardFooter`
- 4 padding options: `none`, `sm`, `md`, `lg`

**Usage**:
```tsx
<Card variant="elevated" interactive>
  <CardHeader>
    <CardTitle>Policy Certificate</CardTitle>
    <CardDescription>Weekly coverage details</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Input
**File**: `Input.tsx`
**Features**:
- Base Input component with prefix/suffix support
- Specialized `PhoneInput` for Indian numbers (+91 prefix)
- `OTPInput` with 6 individual digit boxes, auto-advance, paste support
- Error states with shake animations
- Helper text support
- 3 sizes: `sm`, `md`, `lg`
- Proper focus states and accessibility

**Usage**:
```tsx
<Input label="Mobile Number" error="Please enter a valid number" />
<PhoneInput label="Phone Number" />
<OTPInput length={6} onComplete={(otp) => console.log(otp)} error={false} />
```

#### Select
**File**: `Select.tsx`  
**Features**:
- Custom dropdown (not native select)
- Keyboard navigation (arrow keys, enter, escape)
- Animated dropdown with Framer Motion
- Search/filter capabilities
- Required field indicators
- Disabled option support
- Click outside to close

**Usage**:
```tsx
<Select 
  options={[
    { label: 'Mumbai Central', value: 'mum-central' },
    { label: 'Delhi NCR', value: 'delhi-ncr' }
  ]}
  placeholder="Select your zone"
  onChange={(value) => console.log(value)}
/>
```

#### Skeleton
**File**: `Skeleton.tsx`
**Features**:
- 4 variants: `text`, `circle`, `card`, `rectangle`
- Animated shimmer effect (pulse + gradient)
- Multi-line text skeletons with realistic proportions
- Pre-built layouts: `SkeletonProfile`, `SkeletonClaimCard`
- Customizable dimensions

**Usage**:
```tsx
<Skeleton variant="text" lines={3} />
<SkeletonCircle width={48} height={48} />
<SkeletonClaimCard />
```

### Advanced Components

#### Modal
**File**: `Modal.tsx`
**Features**:
- Framer Motion animations (scale + fade)
- 5 sizes: `sm`, `md`, `lg`, `xl`, `full`
- Backdrop click to close (configurable)
- Escape key to close (configurable)
- Body scroll lock when open
- Composition with `ModalHeader`, `ModalBody`, `ModalFooter`
- `ConfirmModal` for dangerous actions
- `useModal` hook for state management
- Zustand store for global modal management

**Usage**:
```tsx
const { isOpen, openModal, closeModal } = useModal();

<Modal isOpen={isOpen} onClose={closeModal} title="Confirm Payout">
  <p>Are you sure you want to process this ₹420 payout?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={closeModal}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </ModalFooter>
</Modal>
```

#### Toast
**File**: `Toast.tsx`
**Features**:
- 4 types: `success`, `error`, `warning`, `info`
- Auto-dismiss with progress bar
- Slide-in animations from top-right
- Action buttons support
- Zustand store for queue management
- `useToast` hook for easy usage
- Global `ToastContainer` component

**Usage**:
```tsx
const { toast } = useToast();

// In your app root:
<ToastContainer />

// Trigger toasts:
toast.success('Payout processed successfully!', '₹420 has been sent to your UPI');
toast.error('Claim rejected', 'This event does not qualify for coverage');
```

## Design System Integration

All components use the established design tokens:

### Colors
- **Brand**: Primary (#1B4FCC), Secondary (#F5A623), Accent (#00C896), Danger (#E53535)
- **Surface**: Base (#F7F8FC), Card (#FFFFFF), Subtle (#EEF1FA), Inverse (#0D1B3E)
- **Text**: Primary (#0D1B3E), Secondary (#4A5568), Muted (#A0AEC0), Inverse (#FFFFFF)

### Typography
- **Display**: Sora (headings, buttons)
- **Body**: DM Sans (content, inputs)
- **Mono**: JetBrains Mono (policy IDs, amounts)

### Spacing
8px base scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px

### Shadows
- **Card**: `0 1px 3px rgba(13,27,62,0.06), 0 4px 16px rgba(13,27,62,0.08)`
- **Elevated**: `0 8px 32px rgba(13,27,62,0.12), 0 2px 8px rgba(13,27,62,0.08)`
- **Brand**: `0 4px 24px rgba(27,79,204,0.20)`

## Installation & Usage

### Import Components
```tsx
import { 
  Button, 
  Badge, 
  Card, 
  Input, 
  PhoneInput, 
  OTPInput, 
  Select, 
  Modal, 
  Toast, 
  Skeleton,
  useToast,
  useModal 
} from '@/components/ui';
```

### Required Dependencies
- `framer-motion` - Animations
- `zustand` - State management for Toast/Modal
- `tailwindcss` - Styling

### Setup Toast Provider
Add `ToastContainer` to your app root:
```tsx
// app/layout.tsx
import { ToastContainer } from '@/components/ui';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
```

## Accessibility Features

All components include:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader announcements
- Color contrast compliance
- Semantic HTML structure

## Animation Philosophy

Motion is purposeful and stress-reducing:
- **Button loading**: Text slides up/out, spinner slides in from below
- **Modal**: Scale up from 95% with backdrop fade
- **Toast**: Slide in from top-right with spring physics
- **Card hover**: Subtle lift (-2px translate)
- **Select dropdown**: Fade + scale from trigger position
- **Active states**: Gentle scale down (98%)

## File Structure

Both apps have identical component structure:

```
apps/
├── worker-web/src/components/ui/
│   ├── Button.tsx
│   ├── Badge.tsx  
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Skeleton.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── index.ts
└── admin-web/src/components/ui/
    ├── Button.tsx
    ├── Badge.tsx
    ├── Card.tsx  
    ├── Input.tsx
    ├── Select.tsx
    ├── Skeleton.tsx
    ├── Modal.tsx
    ├── Toast.tsx
    └── index.ts
```

## Production Ready

All components are:
- ✅ Fully typed with TypeScript
- ✅ Responsive and mobile-optimized  
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Animated with Framer Motion
- ✅ Tested interaction patterns
- ✅ Design system compliant
- ✅ Performance optimized
- ✅ Cross-browser compatible

The component library provides a solid foundation for building the remaining Suraksha Weekly interfaces with consistent, professional quality.