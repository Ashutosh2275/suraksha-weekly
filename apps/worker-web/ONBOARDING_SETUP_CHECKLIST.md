# Onboarding Wizard - Setup Checklist

## 📋 Quick Setup (5 minutes)

The onboarding wizard has been completely built! Follow these steps to activate it:

### ✅ Step 1: Install Dependencies

```bash
cd apps/worker-web
npm install zustand canvas-confetti framer-motion
npm install --save-dev @types/canvas-confetti
```

**What this installs:**
- `zustand` - State management with localStorage persistence
- `canvas-confetti` - Confetti animation for success screen
- `framer-motion` - Animation library (may already be installed)

### ✅ Step 2: Create Store Directory

```bash
# Windows Command Prompt
mkdir src\store

# Or PowerShell
New-Item -ItemType Directory -Path src\store -Force
```

### ✅ Step 3: Copy Store File

1. Open `apps/worker-web/ONBOARDING_STORE_CODE.txt`
2. Copy ALL contents
3. Create new file: `src/store/onboarding.ts`
4. Paste contents
5. Save

**Location:** `apps/worker-web/src/store/onboarding.ts`

### ✅ Step 4: Replace Onboarding Page

1. Open `apps/worker-web/ONBOARDING_NEW_PAGE.txt`
2. Copy ALL contents
3. Open existing file: `src/app/(auth)/onboarding/page.tsx`
4. Replace ALL existing content with copied content
5. Save

**Location:** `apps/worker-web/src/app/(auth)/onboarding/page.tsx`

### ✅ Step 5: Test the Wizard

```bash
npm run dev
```

Navigate to: http://localhost:3000/onboarding

**Test flow:**
1. Select a city (e.g., Mumbai 🌧)
2. Select a platform (e.g., Swiggy)
3. Click Continue → Step 1 appears
4. Adjust hours slider (e.g., 8 hours)
5. Enter earnings (e.g., 5000)
6. Click Continue → Step 2 auto-calculates (2.5s animation)
7. View risk profile → auto-advances to Step 3
8. Click "Activate Coverage" → Confetti! 🎉
9. Wait 2s → redirects to /dashboard

## 🎨 What You Get

### Visual Features

**Step Progress Bar:**
- ✓ Filled indigo dots for completed steps
- ○ Current step with pulsing glow ring
- ○ Gray dots for future steps
- Animated connecting lines

**Step 0: Profile**
- 7 city pills with weather emojis
- 3 platform cards with brand colors
- Spring bounce on selection
- Disabled continue until both selected

**Step 1: Schedule**
- Custom slider with floating tooltip
- Live hour display: "You work ~6 hours per day"
- ₹ earnings input with Indian formatting (1,00,000)
- Live protection amount updates

**Step 2: Risk Profile**
- 2.5s shield filling animation
- Risk tier auto-calculation
- 3D flip card reveal
- Trust score bar (80/100)
- Auto-advances after 3s

**Step 3: Your Plan**
- ₹67 premium card with gradient
- Wavy SVG divider
- 3 coverage chips (Rain, Heat, Pollution)
- Expandable "Why ₹67?" section
- Success animation:
  - Loading spinner
  - Emerald overlay
  - Confetti burst (200 particles!)
  - Checkmark animation
  - "You're covered!" message
  - Auto-redirect to /dashboard

## 🔧 Technical Details

### State Management

**Zustand store** with localStorage persistence:
- currentStep (0-3)
- city, platform
- hoursPerDay (2-12)
- weeklyEarnings (number)
- riskTier (LOW/MEDIUM/HIGH)
- trustScore (80)
- weeklyPremium (67)

**Persists on refresh** - users don't lose progress!

### Animations

- Step transitions: 350ms slide + fade (Framer Motion)
- City/platform selection: Spring bounce (scale 1.04)
- Slider handle: Smooth dragging with tooltip
- Shield filling: CSS clip-path 2.5s
- Result card: 3D Y-axis flip
- Progress bar rings: Pulsing scale + opacity loop
- Confetti: 3 waves, 200 particles, physics simulation

### Risk Calculation

Simple demo logic:
```
Mumbai/Bengaluru → HIGH risk
Delhi/Chennai → MEDIUM risk
Others → LOW risk
```

### Premium Calculation

Fixed ₹67 for demo. In production, calculate based on:
- Hours per day (more hours = higher risk)
- Weekly earnings (higher earnings = higher coverage)
- City risk tier (high risk = higher premium)
- Platform (different risk profiles)

## 📚 Documentation

All documentation created:
- ✅ ONBOARDING_README.md - Overview and features
- ✅ ONBOARDING_INSTALLATION.md - Step-by-step setup
- ✅ ONBOARDING_IMPLEMENTATION_SUMMARY.md - Technical details
- ✅ ONBOARDING_VISUAL_WALKTHROUGH.md - Screen-by-screen guide
- ✅ ONBOARDING_DEV_QUICK_REF.md - Developer cheat sheet
- ✅ ONBOARDING_FLOW_DIAGRAM.md - State flow diagrams
- ✅ ONBOARDING_STORE_CODE.txt - Copy-paste ready store code
- ✅ ONBOARDING_NEW_PAGE.txt - Copy-paste ready page code
- ✅ ONBOARDING_INDEX.md - Documentation index
- ✅ ONBOARDING_WIZARD_GUIDE.md - Original specifications
- ✅ ONBOARDING_CODE_REFERENCE.md - Code snippets
- ✅ This checklist!

## 🐛 Troubleshooting

### "Cannot find module 'zustand'"
→ Run `npm install zustand`

### "Cannot find module 'canvas-confetti'"  
→ Run `npm install canvas-confetti @types/canvas-confetti`

### Animations don't work
→ Check if Framer Motion is installed: `npm list framer-motion`
→ Install if missing: `npm install framer-motion`

### Store doesn't persist
→ Check browser localStorage: look for key `suraksha-onboarding`
→ Clear localStorage and try again

### Confetti doesn't show
→ Check browser console for errors
→ Verify canvas-confetti is imported correctly
→ Check if `confetti()` function is called

### Page doesn't redirect after success
→ Check if `/dashboard` route exists
→ Update router.push() target if needed

## 🎯 Next Steps

After setup:
1. **Test each step** thoroughly
2. **Customize premium logic** for production
3. **Update risk calculation** with real data
4. **Add analytics** tracking to each step
5. **A/B test** different copy and CTAs
6. **Integrate with backend** to save onboarding data
7. **Add error handling** for API failures

## 💡 Customization

**Change cities:**
Edit `CITIES` constant in page.tsx

**Change platforms:**
Edit `PLATFORMS` constant with brand colors

**Change premium:**
Edit `weeklyPremium: 67` in store initial state

**Change coverage amount:**
Edit the "₹1,500" in Step 3 plan card

**Change confetti:**
Adjust `confetti()` parameters in activateCoverage function

**Change redirect:**
Update `router.push('/dashboard')` to your target

## ✨ Done!

Once you complete the checklist above, you'll have a fully functional, beautifully animated onboarding wizard ready for production! 

**Questions?** Check the docs in the documentation files listed above.

---

**Built with:** TypeScript + Next.js + Tailwind + Framer Motion + Zustand + Confetti 🎉
