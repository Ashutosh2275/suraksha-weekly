# Suraksha Weekly Authentication Screen

## 📍 Location
`apps/worker-web/src/app/(auth)/page.tsx`

## 🎨 Design Overview

A stunning full-screen authentication experience with a diagonal split hero design that embodies Suraksha Weekly's brand identity of trust, protection, and warmth.

### Visual Concept
- **Desktop**: Diagonal split with hero on left (50%), form on right (50%)
- **Mobile**: Stacked vertically — hero at top (40vh), form below
- **Animations**: Framer Motion for smooth, professional transitions

## 🏗️ Structure

### Left Panel (Hero Section)
**Background**: Deep navy (#0D1B3E) with animated gradient pulses

**Content**:
1. **Logo & Wordmark**
   - Shield SVG icon (32x32)
   - "Suraksha Weekly" in Sora 700, white
   
2. **Tagline**
   - "Your income. Protected."
   - Sora 400, indigo-200 color
   
3. **Rotating Value Props** (3s fade transition)
   - "Rain stops deliveries. We've got you covered."
   - "Auto-payout in minutes. No forms, no waiting."
   - "₹29/week. Cancel anytime."

**Animated Background**:
- Slow-moving radial gradient pulses
- Two overlapping blurred circles
- 8-10s animation cycles
- Creates depth and movement

### Right Panel (Form Section)
**Background**: Off-white (#F7F8FC)

**Phone Input Step**:
- Heading: "Enter your mobile number"
- Custom input with Indian flag emoji + +91 prefix
- 10-digit validation
- Large "Send OTP" button

**OTP Verification Step**:
- "Change number" back button
- "Enter OTP" heading
- Shows masked phone: "+91 98765..."
- 6 individual digit input boxes
- Auto-advance on input
- Paste support for OTP codes
- "Verify OTP" button
- Resend timer (45s countdown)

**Trust Indicators**:
- Secure (shield icon)
- IRDAI Approved (checkmark icon)
- 24/7 Support (plus icon)

## ✨ Key Features

### 1. Staggered Page Load Animation
```typescript
// Hero fades in first (0ms)
motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}

// Form slides up after (300ms delay)
motion.div initial={{ opacity: 0, y: 50 }} delay: 0.3
```

### 2. Rotating Messages
- Auto-rotates every 3 seconds
- Smooth fade in/out transitions
- Uses `AnimatePresence` with `mode="wait"`
- Message index cycles through array

### 3. Phone Input
```typescript
- Indian flag emoji: 🇮🇳
- Fixed +91 prefix
- Numeric-only input (strips non-digits)
- Auto-focus on mount
- 10-digit maxLength
- Real-time validation
```

### 4. OTP Flow
**Button Transform**:
- Submit → Loading spinner → Slide up reveals OTP inputs

**6 Digit Boxes**:
```typescript
- Auto-advance to next box on input
- Backspace moves to previous box
- Paste support (distributes 6 digits)
- Individual focus states
- Error state: red border + shake animation
```

**States**:
- Empty: Gray border
- Filled: Blue border with light blue background
- Error: Red border with shake animation

### 5. Error Handling
```typescript
Phone errors:
- "Please enter a valid 10-digit mobile number"

OTP errors:
- "Please enter all 6 digits"
- "Invalid OTP. Please try again."

On error:
- Clears OTP inputs
- Shakes digit boxes
- Returns focus to first box
- Shows error message with aria-live
```

### 6. Resend OTP
```typescript
Timer: 45 seconds countdown
Display: "Resend OTP in 0:45"
When complete: "Resend OTP" link appears
On click: Resets timer, clears errors
```

## ♿ Accessibility Features

### Keyboard Navigation
- ✅ Tab order follows visual flow
- ✅ Enter submits forms
- ✅ Backspace navigates OTP boxes
- ✅ All interactive elements focusable

### Screen Readers
```typescript
- Proper labels (sr-only where needed)
- aria-label for icons/buttons
- aria-live="polite" for errors
- aria-invalid on error states
- aria-describedby linking errors
```

### Focus Management
```typescript
- Auto-focus on phone input (page load)
- Auto-focus on first OTP box (after sending)
- Focus first box on OTP error
- Clear focus indicators
```

## 🎯 User Flow

```
1. Page loads → Hero fades in → Form slides up
2. User enters 10-digit phone number
3. Clicks "Send OTP" → Button shows loading
4. Form transitions to OTP step
5. User enters 6 digits (auto-advance)
6. If correct → Redirects to /dashboard
7. If wrong → Shake animation + error + clear inputs
8. Can resend OTP after 45s countdown
```

## 🔧 Installation & Setup

### 1. Install Framer Motion
```bash
cd apps/worker-web
npm install framer-motion
```

### 2. File Structure
```
apps/worker-web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx      # Auth layout wrapper
│   │   │   └── page.tsx        # Auth page (this file)
│   │   └── globals.css         # Includes shake animation
│   └── components/ui/
│       └── Button.tsx          # Used in forms
```

### 3. Dependencies Used
```json
{
  "framer-motion": "^10.x",      // Animations
  "react": "^18.3.1",            // Core
  "next": "^14.2.35"             // Framework
}
```

## 🎨 CSS Animations

### Shake Animation (globals.css)
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
```

### Background Pulses
```typescript
Pulse 1: scale [1, 1.2, 1], 8s duration
Pulse 2: scale [1.2, 1, 1.2], 10s duration
Both: infinite repeat with easeInOut
```

## 🧪 Testing Notes

### Test OTP Code
```
Correct OTP: 123456
Any other: Shows error
```

### Form Validation
```typescript
Phone: Must be exactly 10 digits
OTP: Must fill all 6 boxes
```

### Responsive Breakpoints
```css
Mobile: < 1024px (stacked layout)
Desktop: >= 1024px (diagonal split)
```

## 🚀 Performance Optimizations

1. **Lazy animations**: Only animates visible elements
2. **Auto-cleanup**: useEffect cleanup on unmount
3. **Optimized re-renders**: Proper dependency arrays
4. **Debounced inputs**: No validation on every keystroke
5. **CSS animations**: Shake uses CSS, not JS

## 🎯 Brand Consistency

### Colors Used
```typescript
Hero BG: #0D1B3E (surface-inverse)
Form BG: #F7F8FC (surface-base)
Card: #FFFFFF (surface-card)
Primary: #1B4FCC (brand-primary)
Text: #0D1B3E (text-primary)
Muted: #A0AEC0 (text-muted)
Indigo 100-200: For tagline/messages
```

### Typography
```typescript
Headings: Sora (font-display)
Body: DM Sans (font-body)
Numbers: JetBrains Mono (font-mono)
```

### Spacing
```typescript
Follows 8px grid: p-6, p-8, gap-3, gap-6
Border radius: rounded-md (12px), rounded-xl (24px)
```

## 📱 Mobile Considerations

- Hero height: 40vh (shows full message)
- Touch-friendly input sizes (48px min)
- No hover states on mobile
- Keyboard-aware scrolling
- Portrait orientation optimized

## 🔐 Security Notes

**Current Implementation** (Demo):
- Simulates API calls with setTimeout
- Hardcoded OTP validation
- No real auth backend

**Production TODO**:
- Integrate with auth API
- Add rate limiting
- Implement CSRF protection
- Use secure session tokens
- Add fingerprinting

## 🎬 Demo Flow

1. Open `/` (auth page)
2. Enter any 10-digit number (e.g., 9876543210)
3. Click "Send OTP"
4. Wait 1.5s (simulated API)
5. Enter OTP: `123456`
6. Click "Verify OTP"
7. Redirects to /dashboard

Try wrong OTP to see shake animation!

---

**Built with trust. Designed for protection.** 🛡️
