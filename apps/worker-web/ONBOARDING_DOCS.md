# Suraksha Weekly Onboarding Flow

## 📍 Location
`apps/worker-web/src/app/(auth)/onboarding/page.tsx`

## 🎨 Design Overview

A beautiful 4-step card-based wizard that collects worker information and displays their personalized insurance plan with smooth animations and interactive components.

## 🏗️ Step-by-Step Breakdown

### Progress Indicator (Top)
- **4 connected dots** with a horizontal line
- **Completed steps**: Filled indigo with checkmark
- **Current step**: Pulsing indigo number
- **Future steps**: Gray outline
- **Progress line**: Animates from left to right
- **Step labels**: Below each dot (About You, Your Week, Risk Profile, Your Plan)

### Navigation
- **Slide animations**: Steps slide in from right, exit to left
- **Direction-aware**: Maintains animation direction consistency
- **Back button**: Appears on steps 2-4
- **Next button**: Disabled until step requirements met
- **Validation**: Real-time checking of required fields

---

## Step 1: "Tell us about yourself"

### City Selector
**Design**: Grid of large pill buttons (2-3 columns responsive)

**Cities**:
- Mumbai
- Delhi
- Bengaluru
- Hyderabad
- Chennai
- Pune
- Other

**States**:
- Unselected: Light gray background, secondary text
- Selected: Indigo background, white text, brand shadow
- Hover: Card shadow

### Platform Selector
**Design**: 3 large logo cards (1-3 columns responsive)

**Platforms**:
1. **Swiggy**: Orange border when selected, orange-tinted background
2. **Zomato**: Red border when selected, red-tinted background
3. **Other**: Brand indigo when selected

**Card Content**:
- Large emoji icon (🍊, 🍅, 📦)
- Platform name in display font
- Border highlights on selection

**Validation**: Both city and platform must be selected to proceed

---

## Step 2: "Your typical week"

### Working Hours Slider
**Question**: "How many hours do you usually work per day?"

**Custom Slider**:
- Range: 2-14 hours
- Track: Gradient (indigo filled portion, gray unfilled)
- Thumb: 24px indigo circle with shadow
- **Motorcycle icon** 🏍️ positioned above thumb
- Smooth animations on drag

**Value Display**:
- Large centered text: "~6 hours/day"
- Font: Sora 700, 5xl size
- Color: Brand indigo

### Weekly Earnings Input
**Question**: "Your average weekly earnings (₹)"

**Custom Number Input**:
- **₹ prefix**: Fixed, large (3xl), gray
- **Amount input**: 3xl font, monospaced
- Auto-formatting: Adds commas (5,000)
- Border: 2px, highlights indigo on focus
- Padding: Large (6x4)

**Helper Text**:
- "This helps us calculate your coverage amount. We keep this private."
- Small, muted color

**Validation**: Hours must be set and earnings entered

---

## Step 3: "Your protection profile"

### Phase 1: Calculating (2 seconds)
**Loading State**:
- Spinning shield icon (360° rotation, infinite loop)
- Text: "Calculating your risk profile..."
- Center-aligned
- Min height: 400px

### Phase 2: Results (Card Flip Animation)
**Transition**: CSS 3D rotateY transform (0° → 90° → 0°)

#### Risk Tier Badge
**Display**: Large pill badge, centered

**Tiers**:
- **LOW**: Green background, green text, shield icon
- **MEDIUM**: Amber background, amber text, shield icon
- **HIGH**: Red background, red text, shield icon

**Calculation Logic**:
```typescript
if (hours > 10 OR earnings < ₹2000) → HIGH
else if (hours > 7 OR earnings < ₹4000) → MEDIUM
else → LOW
```

#### Risk Factor Chips
**Label**: "Factors affecting your premium"

**3 Chips** (horizontal flex, centered):
1. ⏰ {hours} hrs/day
2. 📍 {city}
3. 💼 {platform}

**Style**: Gray background, small text, rounded-full

#### Trust Score Bar
**Display**:
- Label: "Trust Score" (left)
- Value: "80%" (right, large, indigo)
- Progress bar: 3px height, rounded
- Fill: Gradient (indigo → emerald)
- Animation: Width 0% → 80% over 1s with 0.5s delay

**Micro-copy**: 
"Your trust score improves as you maintain a clean claim history"

**Validation**: Waits for calculation to complete (isCalculating = false)

---

## Step 4: "Your weekly plan"

### Large Plan Card (Shadow Elevated)

#### Top Section (Navy Background)
- **Label**: "WEEKLY PREMIUM" (small, indigo-200, uppercase, tracked)
- **Amount**: ₹{premium} (6xl, Sora 700, amber color)
- **Padding**: 8 units
- **Text**: Center-aligned

#### Bottom Section (White Background)

**Coverage Amount**:
- Label: "Coverage up to" (small, secondary)
- Amount: ₹{coverage} (3xl, Sora, indigo)

**3 Coverage Items** (vertical stack):
Each item has:
- Icon circle (40x40, colored background, emoji)
- Title (medium weight, primary)
- Description (small, secondary)

1. 🌧️ **Weather Protection** — Heavy rain, storms
2. 🔥 **Heat Wave Coverage** — Temperature > 42°C
3. 💨 **Air Quality Protection** — AQI > 300

**Icon Backgrounds**:
- Weather: Emerald light
- Heat: Amber light
- AQI: Indigo light

### Premium Explainer (Accordion)

**Trigger**: "Why this price?" with chevron icon

**Content** (revealed on click):
```
Base coverage          ₹29
Working hours (Xhrs)   +₹Y
Earnings tier          +₹Z
────────────────────────
Total weekly premium   ₹{premium}
```

**Calculation**:
```typescript
Base: ₹29
Hours: +₹6 if hours > 8
Earnings: +₹4 if earnings > ₹5000
Total: Sum of above
```

**Animation**: Height auto-expand, opacity fade-in (0.3s)

### CTA Section

**Activate Button**:
- Text: "Activate Coverage — ₹{premium}"
- Size: Large
- Variant: Primary (indigo)
- Width: Full
- Font: Display, text-lg

**Footer Text**:
- "Cancel anytime. Renews weekly."
- Small, muted, centered

**On Click**:
1. **Confetti burst**: 50 colored dots explode from center
2. **Wait 2 seconds**: Let confetti animate
3. **Redirect**: Navigate to `/dashboard`

---

## 🎯 User Flow

```
1. Land on page → See step 1/4
2. Select city (Mumbai) → Button highlights indigo
3. Select platform (Swiggy) → Card gets orange border
4. Click "Next" → Slide left, step 2 appears
5. Drag slider to 8 hours → Motorcycle moves
6. Type earnings "5000" → Auto-formats to "5,000"
7. Click "Next" → Step 3 appears
8. See "Calculating..." with spinning shield → Wait 2s
9. Card flips → Shows MEDIUM risk, 80% trust score
10. Click "Next" → Step 4 appears
11. See plan: ₹35/week, ₹20,000 coverage
12. Click "Why this price?" → Accordion expands
13. Click "Activate Coverage" → Confetti + redirect
```

---

## 🎨 Animations

### Page Transitions
```typescript
slideVariants:
  enter: x: 1000 (from right), opacity: 0
  center: x: 0, opacity: 1
  exit: x: -1000 (to left), opacity: 0
  
Type: spring, stiffness: 300, damping: 30
```

### Progress Dots
**Current step**: Pulsing scale animation
```typescript
scale: [1, 1.1, 1]
duration: 1s
repeat: infinite
```

### Progress Line
**Width animation**: Matches step progress
```typescript
width: ${(currentStep - 1) / 3 * 100}%
duration: 0.3s
```

### Step 3 Card Flip
```typescript
Phase 1 (Calculating):
  initial: opacity: 0, rotateY: 0
  animate: opacity: 1, rotateY: 0
  exit: opacity: 0, rotateY: 90

Phase 2 (Result):
  initial: opacity: 0, rotateY: -90
  animate: opacity: 1, rotateY: 0
  duration: 0.5s
```

### Trust Score Bar
```typescript
initial: width: 0
animate: width: ${trustScore}%
duration: 1s
delay: 0.5s
```

### Confetti Burst
```typescript
50 particles, each:
  initial: x: 50vw, y: 50vh, opacity: 1
  animate: 
    x: random * window.width
    y: random * window.height
    opacity: 0
  duration: 2s
  delay: random * 0.5s
  
Colors: [indigo, amber, emerald, danger]
```

---

## 💡 Premium Calculation Logic

```typescript
function calculatePremium() {
  const baseRate = 29;
  
  // Hours multiplier
  const hourMultiplier = hoursPerDay > 8 ? 1.2 : 1;
  
  // Earnings multiplier
  const earnings = parseInt(weeklyEarnings.replace(/,/g, ''));
  const earningsMultiplier = earnings > 5000 ? 1.15 : 1;
  
  return Math.round(baseRate * hourMultiplier * earningsMultiplier);
}

function calculateCoverage() {
  const earnings = parseInt(weeklyEarnings.replace(/,/g, '')) || 3000;
  return earnings * 4; // 4 weeks coverage
}
```

**Examples**:
- 6 hrs/day, ₹3,000/week → ₹29 premium, ₹12,000 coverage
- 8 hrs/day, ₹5,000/week → ₹29 premium, ₹20,000 coverage
- 10 hrs/day, ₹6,000/week → ₹40 premium, ₹24,000 coverage

---

## ♿ Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter to select buttons
- Arrow keys for slider
- Space to toggle accordion

### Screen Readers
- Progress labels read step names
- Selected states announced
- Calculation status announced
- Premium breakdown readable

### Focus States
- Clear blue ring on all inputs
- Visible focus indicators
- Logical tab order

---

## 📱 Responsive Design

### Desktop (> 640px)
- City pills: 3 columns
- Platform cards: 3 columns
- Plan card: Full width, max 2xl

### Tablet (640px - 1024px)
- City pills: 2 columns
- Platform cards: 2 columns

### Mobile (< 640px)
- City pills: 2 columns
- Platform cards: 1 column (stacked)
- All cards full width
- Larger touch targets

---

## 🎯 State Management

```typescript
State variables:
- currentStep: 1-4
- direction: 1 (forward) | -1 (backward)
- selectedCity: string
- selectedPlatform: string
- hoursPerDay: number (2-14)
- weeklyEarnings: string (formatted)
- isCalculating: boolean
- riskTier: 'LOW' | 'MEDIUM' | 'HIGH'
- trustScore: number (80)
- showExplainer: boolean
- showConfetti: boolean
```

---

## 🎨 Design Tokens Used

```typescript
Colors:
- brand-primary (#1B4FCC): CTAs, selected states
- brand-secondary (#F5A623): Premium amount
- brand-accent (#00C896): Low risk, trust bar
- surface-inverse (#0D1B3E): Plan card header
- surface-card (#FFFFFF): Main cards
- surface-subtle (#EEF1FA): Unselected items
- indigo-200: Label text on dark

Fonts:
- font-display (Sora): Headings, amounts, CTAs
- font-body (DM Sans): Body text
- font-mono (JetBrains Mono): Amounts

Spacing:
- p-8: Card padding
- gap-3/4/6/8: Spacing between elements
- mb-4/6/8/12: Vertical rhythm

Shadows:
- shadow-card: Default cards
- shadow-elevated: Plan card
- shadow-brand: Selected buttons

Radius:
- rounded-xl: Main cards
- rounded-lg: Platform cards
- rounded-full: Pills, buttons
- rounded-md: Inputs
```

---

## 🧪 Test Scenarios

1. **Complete flow**:
   - Select Mumbai + Swiggy
   - Set 8 hours, ₹5,000
   - See MEDIUM risk
   - Activate plan

2. **Back navigation**:
   - Go to step 3
   - Click Back
   - Verify data preserved

3. **Validation**:
   - Try Next without selecting city
   - Verify button disabled

4. **Edge cases**:
   - Min hours (2)
   - Max hours (14)
   - Empty earnings
   - Very high earnings (₹50,000)

5. **Animations**:
   - Watch card flip
   - See confetti burst
   - Observe slider movement

---

## 🚀 Performance

- **Initial load**: < 2s
- **Step transitions**: 300-500ms
- **Calculation delay**: 2s (simulated)
- **Confetti**: 2s animation
- **Bundle size**: Optimized with tree-shaking

---

## 🔧 Future Enhancements

- [ ] Save progress to local storage
- [ ] Add "Save & Exit" option
- [ ] Email plan summary
- [ ] Compare plans side-by-side
- [ ] Add video explainers
- [ ] Seasonal pricing variations
- [ ] Referral code input
- [ ] Multi-platform selection
- [ ] Custom coverage amounts

---

**Built with trust. Designed for protection.** 🛡️
