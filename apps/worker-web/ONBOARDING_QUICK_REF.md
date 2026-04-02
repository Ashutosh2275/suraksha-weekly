# Onboarding Flow - Quick Reference

## 🚀 Quick Start

```bash
# Already running? Just navigate to:
http://localhost:3000/(auth)/onboarding

# Or start fresh:
npm run dev
```

## 📝 Test Path

**Complete in 60 seconds:**

1. **City**: Click "Mumbai"
2. **Platform**: Click "Swiggy" (orange border)
3. **Next** ▶️
4. **Hours**: Drag to "8"
5. **Earnings**: Type "5000"
6. **Next** ▶️
7. **Wait**: 2 seconds (card flips)
8. **Next** ▶️
9. **Activate**: Click button
10. **Celebrate**: Confetti! 🎉

**Result**: ₹29 premium, ₹20,000 coverage, redirects to dashboard

---

## 🎯 Step Overview

| Step | Title | Key Elements | Next Enabled When |
|------|-------|--------------|-------------------|
| 1 | About You | City pills + Platform cards | Both selected |
| 2 | Your Week | Hours slider + Earnings input | Both filled |
| 3 | Risk Profile | Calculation + Risk badge + Trust score | After 2s |
| 4 | Your Plan | Plan card + Accordion + CTA | Always |

---

## 💰 Premium Calculator

```
Base: ₹29
+ Hours bonus: ₹6 (if > 8 hrs/day)
+ Earnings bonus: ₹4 (if > ₹5,000/week)
= Your premium
```

**Examples**:
- 6 hrs, ₹3k = ₹29
- 8 hrs, ₹5k = ₹29
- 10 hrs, ₹6k = ₹40

Coverage = Weekly earnings × 4

---

## 🎨 Visual States

### City Pills
```
Unselected: bg-surface-subtle text-text-secondary
Selected: bg-brand-primary text-text-inverse shadow-brand
```

### Platform Cards
```
Swiggy selected: border-orange-500 bg-orange-50
Zomato selected: border-red-500 bg-red-50
Other selected: border-brand-primary bg-brand-primary-light
```

### Risk Badges
```
LOW: bg-brand-accent-light text-brand-accent
MEDIUM: bg-brand-secondary-light text-brand-secondary
HIGH: bg-brand-danger-light text-brand-danger
```

---

## 🎬 Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Step transition | Slide left/right | 300-500ms |
| Progress dot | Pulsing scale | 1s infinite |
| Progress line | Width expand | 300ms |
| Card flip | 3D rotateY | 500ms |
| Trust score | Width fill | 1s |
| Accordion | Height auto | 300ms |
| Confetti | Particle burst | 2s |

---

## 🔧 Keyboard Shortcuts

- **Tab**: Navigate elements
- **Enter**: Select/Submit
- **Arrow keys**: Slider control
- **Space**: Toggle accordion

---

## 📱 Responsive Breakpoints

| Screen | City Grid | Platform Grid |
|--------|-----------|---------------|
| Desktop | 3 cols | 3 cols |
| Tablet | 2 cols | 2 cols |
| Mobile | 2 cols | 1 col |

---

## ⚡ Quick Scenarios

### Minimum Premium (₹29)
- Hours: 2-8
- Earnings: < ₹5,000
- Risk: LOW

### Maximum Premium (~₹40)
- Hours: 14
- Earnings: > ₹5,000
- Risk: HIGH

### Medium Premium (~₹35)
- Hours: 10
- Earnings: ₹6,000
- Risk: MEDIUM

---

## 🎯 Feature Checklist

- [x] 4-step wizard
- [x] Progress indicator
- [x] Slide transitions
- [x] City selection (7 options)
- [x] Platform selection (3 cards)
- [x] Hours slider (2-14)
- [x] Earnings input (formatted)
- [x] Risk calculation
- [x] Card flip animation
- [x] Trust score bar
- [x] Plan details
- [x] Premium explainer
- [x] Confetti burst
- [x] Auto redirect

---

## 🐛 Troubleshooting

**Next button disabled?**
→ Check all required fields filled

**Slider not working?**
→ Check globals.css has slider styles

**Card not flipping?**
→ Wait full 2 seconds on step 3

**Confetti not showing?**
→ Check showConfetti state triggers

**Page not loading?**
→ Verify framer-motion installed

---

## 📚 Files

```
page.tsx           Main wizard component
globals.css        Slider styles
ONBOARDING_DOCS.md Full documentation
```

---

## 🎨 Design Tokens

**Colors**: `brand-primary`, `brand-secondary`, `brand-accent`  
**Fonts**: `font-display`, `font-body`, `font-mono`  
**Spacing**: `p-8`, `gap-4`, `mb-6`  
**Shadows**: `shadow-card`, `shadow-elevated`, `shadow-brand`

---

## 🔗 Navigation

- Back: Goes to previous step
- Next: Validates & advances
- Direct step access: No (wizard flow)
- Skip steps: No (sequential)

---

## 💡 Pro Tips

1. Watch motorcycle icon follow slider
2. Try paste in earnings input
3. Expand "Why this price?" accordion
4. See confetti before redirect
5. Use Back to review choices
6. Test with different hour ranges
7. Try extreme earnings (₹1k or ₹50k)

---

## ✨ Highlights

**Most Impressive Features**:
1. 🏍️ Motorcycle slider animation
2. 🎴 3D card flip reveal
3. 📊 Animated trust score bar
4. 🎊 Confetti celebration
5. 🔄 Smooth step transitions

---

**Ready? Start here**: `http://localhost:3000/(auth)/onboarding`

**Questions?** See `ONBOARDING_DOCS.md`

---

Built with ❤️ for gig workers 🛡️
