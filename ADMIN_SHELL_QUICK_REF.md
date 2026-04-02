# Admin Dashboard Shell - Quick Reference

## 🎯 At a Glance

**Sophisticated operations center** with dark navy sidebar, organized navigation, and clean content area. Professional, precise design inspired by Linear and Vercel.

## 📁 Key Files

- `apps/admin-web/src/components/AdminShell.tsx` - Main shell component
- `apps/admin-web/src/app/layout.tsx` - Layout wrapper 
- `apps/admin-web/src/app/page.tsx` - Dashboard homepage

## 🎨 Design Tokens

```css
--admin-sidebar-bg: #0D1B3E        /* Navy sidebar */
--admin-sidebar-text: #94A3C0      /* Muted text */  
--admin-sidebar-active: #FFFFFF    /* Active white */
--admin-sidebar-accent: #F5A623    /* Amber accents */
--admin-content-bg: #F4F6FB        /* Content background */
```

## 🧭 Navigation Structure

### Overview
- Dashboard (grid icon)
- Live Demo (play icon) — amber dot when active

### Operations  
- Review Queue (inbox icon) — pending count badge
- Trigger Monitor (radar icon) — active count badge
- Claims (list icon)

### Intelligence
- Fraud Center (shield icon)
- Audit Log (clock icon)

### System
- Settings (gear icon)
- Health Status (pulse icon) — status dot

## ⚡ Quick Actions

### Adding Navigation Item
```tsx
{
  id: 'new-page',
  label: 'New Page',
  href: '/new-page',
  badge: 5, // Optional number or boolean
  icon: <YourIcon />
}
```

### Responsive Breakpoints
- **≥1280px**: Full sidebar (240px)
- **<1280px**: Collapsed sidebar (48px) with tooltips

### Active State Styling
- White text
- 3px amber left border  
- Subtle background tint

## 🎭 Interactive States

### Sidebar Navigation
- **Hover**: Text brightens (150ms)
- **Active**: White text + amber border
- **Badge**: Amber background (numbers) or colored dots (status)

### Search Overlay
- Framer Motion scale + opacity animation
- 320px width, positioned top-right
- Auto-focus on open

## 📦 Dependencies

**Required:**
```bash
npm install framer-motion  # For animations
```

**Already included:**
- next/navigation (routing)
- React (hooks)

## 🚀 Usage

### Basic Setup
```tsx
// app/layout.tsx
import { AdminShell } from '@/components/AdminShell';

export default function RootLayout({ children }) {
  return (
    <AdminShell>{children}</AdminShell>
  );
}
```

### Page Content
```tsx
// Any admin page
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Page Title</h1>
      {/* Content automatically wrapped in shell */}
    </div>
  );
}
```

## 🎨 Color Customization

### Theme Override
```css
/* In globals.css */
:root {
  --admin-sidebar-bg: #your-navy;
  --admin-sidebar-accent: #your-amber;
}
```

### Badge Colors
- `badgeColor: 'amber'` — Default accent
- `badgeColor: 'red'` — Danger/alerts  
- `badgeColor: 'green'` — Success/healthy

## 📱 Mobile Behavior

### Collapsed Mode (<1280px)
- 48px sidebar width
- Icons only, no text
- Hover tooltips with labels
- Same active state styling

### Content Adaptation
- Max-width: 1440px
- 24px padding all sides
- Responsive grid layouts

## ⚙️ Environment Detection

```tsx
// Shows in sidebar header
const environment = process.env.NEXT_PUBLIC_ENV || 'STAGING';

// Styling:
// STAGING: Amber badge
// PRODUCTION: Red warning badge
```

## 🔧 Customization Points

### Layout Dimensions
```tsx
// Sidebar
w-60 (240px) / w-16 (48px collapsed)

// Content area  
max-w-[1440px] mx-auto p-6

// Top bar
h-16 (64px fixed height)
```

### Animation Timing
```tsx
// Route transitions
transition={{ duration: 0.2 }}

// Hover effects  
transition-all duration-150

// Sidebar collapse
transition-all duration-200
```

## 🎯 Next Steps

1. **Install framer-motion** — Required for search animation
2. **Build admin pages** — Dashboard, review queue, etc.
3. **Connect real data** — Replace mock badges with live counts
4. **Add auth logic** — Real user info and logout

## 🐛 Known Issues

- PowerShell 6+ not available (use manual npm install)
- Mock data for badges (needs API integration)
- Logout button not functional yet

## 💡 Pro Tips

- **Badge visibility**: Use sparingly for high-priority items only
- **Icon consistency**: 20x20px SVG with 1.5px stroke
- **Color hierarchy**: Navy → White → Amber for importance
- **Touch targets**: 44px minimum for mobile usability

## 🔗 Related Files

- `ADMIN_SHELL_DOCS.md` - Full technical documentation
- `apps/admin-web/styles/tokens.css` - Design system tokens
- `apps/admin-web/tailwind.config.js` - Tailwind configuration