'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Shield,
  Activity,
  ListChecks,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/claims',     label: 'Claims',     icon: FileText },
  { href: '/fraud-lab',  label: 'Fraud Lab',  icon: Shield },
  { href: '/triggers',   label: 'Triggers',   icon: Activity },
  { href: '/audit-log',  label: 'Audit Log',  icon: ListChecks },
  { href: '/demo',       label: 'Demo Mode',  icon: Zap, badge: 'LIVE' },
];

/**
 * Fixed left sidebar with primary navigation for the admin portal.
 * Uses usePathname for active link highlighting.
 */
export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-40 select-none">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <span className="text-xl" aria-hidden="true">
            🛡️
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-white leading-none">
              Suraksha Admin
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Insurer Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon
                size={17}
                className={cn(isActive ? 'text-white' : 'text-slate-400')}
              />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white leading-none">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/60">
        <p className="text-xs text-slate-500">Suraksha Weekly · v1.0</p>
        <p className="text-xs text-slate-600 mt-0.5">© 2026 Admin Portal</p>
      </div>
    </aside>
  );
}
