# Admin Dashboard Shell - Technical Documentation

## Overview

The AdminShell component provides a sophisticated, data-dense operations center for the Suraksha Weekly admin dashboard. It features a dark sidebar with navigation, a clean content area, and professional styling inspired by Linear and Vercel dashboards.

## Architecture

### Layout Structure
```
AdminShell
├── Sidebar (240px fixed, collapsible to 48px)
│   ├── Top Section (logo, environment badge)
│   ├── Navigation (grouped sections)
│   └── Bottom Section (user info, logout)
├── Top Bar (breadcrumbs, search, notifications)
└── Content Area (max-width 1440px, centered)
```

### Files Created/Modified

1. **`apps/admin-web/src/components/AdminShell.tsx`** - Main shell component (17.1KB)
2. **`apps/admin-web/src/app/layout.tsx`** - Updated to use AdminShell wrapper
3. **`apps/admin-web/src/app/page.tsx`** - Dashboard homepage with stats grid
4. **`apps/admin-web/src/app/globals.css`** - Added admin color tokens
5. **`apps/admin-web/tailwind.config.js`** - Extended with admin color utilities

## Design System

### Color Tokens (CSS Custom Properties)
```css
--admin-sidebar-bg: #0D1B3E        /* Deep navy sidebar */
--admin-sidebar-text: #94A3C0      /* Muted blue-gray text */
--admin-sidebar-active: #FFFFFF    /* White for active items */
--admin-sidebar-accent: #F5A623    /* Amber for badges/alerts */
--admin-content-bg: #F4F6FB        /* Pale blue-gray content area */
--admin-card-bg: #FFFFFF           /* White card backgrounds */
--admin-border: #E2E8F0            /* Light border color */
```

### Navigation Structure

#### Overview Section
- **Dashboard** - Main admin home with stats overview
- **Live Demo** - Demo mode toggle (amber dot when active)

#### Operations Section
- **Review Queue** - Manual claim reviews (shows pending count badge)
- **Trigger Monitor** - Active weather/event triggers (shows active count)
- **Claims** - Claims management interface

#### Intelligence Section
- **Fraud Center** - Fraud detection and monitoring
- **Audit Log** - System activity timeline

#### System Section
- **Settings** - Admin configuration
- **Health Status** - System health monitoring (green/amber/red status dot)

### Interactive States

#### Navigation Items
- **Default**: Gray text with hover brightening
- **Active**: White text + 3px amber left border + subtle background tint
- **Badges**: 
  - Number badges: Amber background with black text
  - Status dots: Green/amber/red circular indicators

#### Responsive Behavior
- **Desktop (≥1280px)**: Full 240px sidebar
- **Mobile (<1280px)**: Collapsed 48px sidebar with icon-only navigation
- **Tooltips**: Show on hover in collapsed mode

## Component Features

### AdminShell Props
```typescript
interface AdminShellProps {
  children: React.ReactNode;
}
```

### Key State Management
- `isSidebarCollapsed`: Boolean for sidebar state
- `showSearch`: Boolean for search overlay visibility
- `pathname`: Current route for navigation highlighting

### Navigation Configuration
Navigation is data-driven via the `NAV_SECTIONS` array:

```typescript
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number | boolean;
  badgeColor?: 'amber' | 'red' | 'green';
}

interface NavSection {
  label: string;
  items: NavItem[];
}
```

## Animations

### Page Transitions
- **Fade-in**: 200ms opacity transition on route change
- **Sidebar**: 200ms width transition for collapse/expand
- **Search**: Scale + opacity animation (Framer Motion)

### Hover Effects
- **Navigation**: 150ms text color transitions
- **Buttons**: Background color changes with smooth transitions

## Environment Detection

The shell displays environment badges:
- **STAGING**: Amber badge with border
- **PRODUCTION**: Red badge (warning styling)

Environment is detected via `process.env.NEXT_PUBLIC_ENV` or defaults to "STAGING".

## Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Proper focus management
- Tab order follows visual hierarchy

### Screen Reader Support
- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Hidden text for icons in collapsed mode

### Touch Targets
- Minimum 44px touch targets on all interactive elements
- Sufficient spacing between clickable areas

## Usage Examples

### Basic Implementation
```tsx
// In app/layout.tsx
import { AdminShell } from '@/components/AdminShell';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
```

### Route Highlighting
The shell automatically highlights the active route based on `usePathname()`. Routes are matched using:
- Exact match for `/dashboard` (also matches `/`)
- Prefix match for all other routes

### Adding New Navigation Items
1. Add item to appropriate section in `NAV_SECTIONS`
2. Include icon (20x20 SVG recommended)
3. Set badge if needed (number or boolean)
4. Create corresponding page route

## Dependencies

### Required Packages
- **framer-motion**: For animations and transitions
- **next/navigation**: For routing (`usePathname`, `useRouter`)
- **React**: Hooks (`useState`)

### Installation
```bash
npm install framer-motion
```

## Performance Considerations

### Optimizations
- Icons are inline SVG for fastest loading
- CSS custom properties for efficient theming
- Minimal JavaScript bundle size
- No external icon libraries

### Bundle Impact
- AdminShell component: ~17KB
- Framer Motion: Added only for search animation
- All navigation icons embedded (no external requests)

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### CSS Features Used
- CSS Custom Properties (IE 11+ with polyfill)
- Flexbox (IE 11+)
- Grid (IE 11+ with -ms- prefix)

## Customization

### Theming
Colors can be customized by modifying CSS custom properties in `globals.css`:

```css
:root {
  --admin-sidebar-bg: #your-color;
  --admin-sidebar-accent: #your-accent;
  /* etc. */
}
```

### Navigation Structure
Modify `NAV_SECTIONS` array in AdminShell.tsx to add/remove/reorganize navigation items.

### Layout Dimensions
- Sidebar width: `w-60` (240px) / `w-16` (64px collapsed)
- Content max-width: `max-w-[1440px]`
- Top bar height: `h-16` (64px)

## Known Limitations

1. **Single-level navigation**: No nested menu support
2. **Fixed layout**: Sidebar always on left, content on right
3. **Static navigation**: No dynamic menu loading from API

## Future Enhancements

### Planned Features
- User preferences persistence (sidebar state)
- Keyboard shortcuts for navigation
- Breadcrumb automation based on route structure
- Real-time notification system
- Multi-level navigation support

### Technical Debt
- Move navigation configuration to external file
- Add unit tests for navigation highlighting
- Implement proper logout functionality
- Add loading states for route transitions