# 🚀 Suraksha Weekly Auth Screen - Setup Guide

## Quick Start

Follow these steps to get the authentication screen running:

### 1. Install Framer Motion

```bash
cd apps/worker-web
npm install framer-motion
```

### 2. Files Created

✅ **Auth Page**: `apps/worker-web/src/app/(auth)/page.tsx`  
✅ **Auth Layout**: `apps/worker-web/src/app/(auth)/layout.tsx`  
✅ **Updated Globals**: `apps/worker-web/src/app/globals.css` (shake animation)  
✅ **Updated Tailwind**: `apps/worker-web/tailwind.config.js` (indigo colors)  
✅ **Documentation**: `apps/worker-web/AUTH_SCREEN_DOCS.md`

### 3. Start Development Server

```bash
# From project root
npm run dev

# Or from worker-web directory
cd apps/worker-web
npm run dev
```

The app will be available at: **http://localhost:3000**

### 4. View Auth Screen

Navigate to the root path: **http://localhost:3000** or **http://localhost:3000/(auth)**

Both routes will show the authentication screen.

## 🧪 Testing the Auth Flow

### Test Credentials

**Phone Number**: Any 10-digit number (e.g., `9876543210`)  
**Correct OTP**: `123456`  
**Wrong OTP**: Any other 6-digit code

### Test Scenarios

1. **Happy Path**:
   - Enter phone: `9876543210`
   - Click "Send OTP"
   - Wait for transition
   - Enter OTP: `123456`
   - Click "Verify OTP"
   - → Redirects to `/dashboard`

2. **Validation Errors**:
   - Enter less than 10 digits
   - Click "Send OTP"
   - → See error message

3. **Wrong OTP**:
   - Send OTP
   - Enter anything except `123456`
   - → See shake animation + error

4. **Resend OTP**:
   - Send OTP
   - Wait for 45s countdown
   - Click "Resend OTP" when available

5. **Paste OTP**:
   - Send OTP
   - Copy `123456` to clipboard
   - Click first OTP box and paste (Ctrl+V / Cmd+V)
   - → All boxes fill automatically

6. **Change Number**:
   - After sending OTP, click "Change number"
   - → Returns to phone input

## 📱 Responsive Testing

### Desktop (>= 1024px)
- Diagonal split layout
- Hero on left (50%)
- Form on right (50%)
- Diagonal edge visible

### Mobile (< 1024px)
- Stacked vertically
- Hero at top (40vh)
- Form below
- Full-width components

### Test in Browser DevTools
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different screen sizes:
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1440px)

## 🎨 Visual Features to Notice

### 1. Animated Background
- Two slow-pulsing gradient circles
- Blue and teal colors
- Subtle depth effect

### 2. Rotating Messages
- Changes every 3 seconds
- Smooth fade transitions
- Three value propositions

### 3. Button Loading State
- Spinner appears on submit
- Button text hidden
- Smooth transition

### 4. OTP Auto-Advance
- Type digit → moves to next box
- Backspace → moves to previous box
- Paste → fills all boxes

### 5. Error Shake
- Wrong OTP triggers shake
- Boxes turn red
- Inputs clear automatically

### 6. Trust Indicators
- Three icons at bottom
- "Secure", "IRDAI Approved", "24/7 Support"
- Consistent styling

## 🔧 Troubleshooting

### Issue: Framer Motion not installed
**Error**: `Cannot find module 'framer-motion'`  
**Fix**: Run `npm install framer-motion` in `apps/worker-web`

### Issue: Tailwind classes not working
**Error**: Colors don't appear  
**Fix**: 
1. Check `tailwind.config.js` has the extended colors
2. Restart dev server
3. Clear `.next` cache: `npm run clean`

### Issue: Fonts not loading
**Error**: Fonts look wrong  
**Fix**: 
1. Check internet connection (Google Fonts CDN)
2. Verify `globals.css` imports `tokens.css`
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: OTP boxes not working
**Error**: Can't type in boxes  
**Fix**: Make sure all digit boxes render correctly (check console for errors)

### Issue: Animations not smooth
**Error**: Janky animations  
**Fix**: 
1. Close other heavy apps
2. Test in Chrome/Edge (best performance)
3. Check GPU acceleration enabled

## 📊 Performance Metrics

Expected performance:
- **First Load**: < 2s
- **Page Transition**: ~600ms
- **OTP Step**: ~300ms
- **Lighthouse Score**: 90+

## 🎯 Next Steps

### Integrate with Real Backend

1. **Replace mock API calls**:
```typescript
// Current (mock)
await new Promise((resolve) => setTimeout(resolve, 1500));

// Replace with
const response = await fetch('/api/auth/send-otp', {
  method: 'POST',
  body: JSON.stringify({ phone }),
});
```

2. **Add proper error handling**:
```typescript
try {
  const data = await sendOtp(phone);
  setStep('otp');
} catch (error) {
  setError('Failed to send OTP. Please try again.');
}
```

3. **Add session management**:
```typescript
// After successful OTP verification
const { token } = await verifyOtp(phone, otpCode);
localStorage.setItem('authToken', token);
router.push('/dashboard');
```

### Add Features

- [ ] Rate limiting (max 3 OTP requests per hour)
- [ ] Phone number formatting (98765 43210)
- [ ] "Remember me" option
- [ ] Email fallback
- [ ] Biometric login (future)
- [ ] Social login options (Google, etc.)

### Improve UX

- [ ] Add haptic feedback (mobile vibration)
- [ ] Sound effects for success/error
- [ ] Progressive web app (PWA) support
- [ ] Offline mode handling
- [ ] Better loading skeletons

## 📝 Code Structure

```
(auth)/page.tsx
├── State Management
│   ├── step (phone | otp)
│   ├── phone (10 digits)
│   ├── otp (6-digit array)
│   ├── isLoading
│   ├── error
│   ├── messageIndex
│   └── resendTimer
│
├── Effects
│   ├── Rotating messages (3s interval)
│   └── Resend countdown (1s interval)
│
├── Event Handlers
│   ├── handlePhoneSubmit
│   ├── handleOtpChange
│   ├── handleOtpKeyDown
│   ├── handleOtpPaste
│   ├── handleOtpSubmit
│   └── handleResendOtp
│
└── Components
    ├── Hero Section (motion.div)
    │   ├── Animated background
    │   ├── Logo + tagline
    │   └── Rotating messages
    │
    └── Form Section (motion.div)
        ├── Phone step
        │   ├── Input with +91
        │   └── Send OTP button
        │
        ├── OTP step
        │   ├── 6 digit boxes
        │   ├── Verify button
        │   └── Resend timer
        │
        └── Trust indicators
```

## 🎨 Design Tokens Used

```typescript
Colors:
- surface-inverse: #0D1B3E (hero background)
- surface-base: #F7F8FC (form background)
- surface-card: #FFFFFF (card background)
- brand-primary: #1B4FCC (buttons, focus)
- brand-danger: #E53535 (errors)
- text-primary: #0D1B3E (main text)
- text-secondary: #4A5568 (labels)
- text-muted: #A0AEC0 (hints)
- text-inverse: #FFFFFF (on dark)
- indigo-100/200: Tagline colors

Fonts:
- font-display: Sora (headings)
- font-body: DM Sans (text)
- font-mono: JetBrains Mono (numbers)

Spacing:
- p-6: 24px
- p-8: 32px
- gap-3: 12px
- gap-6: 24px

Borders:
- rounded-md: 12px
- rounded-xl: 24px

Shadows:
- shadow-card: Subtle elevation
```

## 🐛 Known Issues

None currently! 🎉

Report issues by creating a ticket or documenting them here.

---

**Need help?** Check `AUTH_SCREEN_DOCS.md` for detailed documentation.

**Built with trust. Designed for protection.** 🛡️
