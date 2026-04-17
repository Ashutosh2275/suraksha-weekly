'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Shield, Activity, Wallet, LogOut, ChevronRight, Bell, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const navItems = [
  { icon: Home, label: 'Overview', href: '/dashboard' },
  { icon: Shield, label: 'Coverage', href: '/dashboard/coverage' },
  { icon: Activity, label: 'Live Events', href: '/dashboard/events' },
  { icon: Wallet, label: 'Payouts', href: '/dashboard/payouts' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-50 flex font-sans selection:bg-emerald-500/30">
      {/* Background Noise & Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col border-r border-white-[0.04] bg-[#0a0a0a]/80 backdrop-blur-2xl relative z-20">
        <div className="h-16 flex items-center px-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase text-neutral-200">Suraksha</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group \${isActive ? 'text-white bg-white/[0.04]' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'}`}>
                  {isActive && (
                    <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-5 bg-emerald-400 rounded-r-full" />
                  )}
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center border border-white/10 shrink-0">
              <span className="text-xs font-bold text-neutral-300">RS</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-200 truncate">Rahul Sharma</p>
              <p className="text-xs text-neutral-500 truncate">Pro Shield Active</p>
            </div>
            <LogOut className="w-4 h-4 text-neutral-600 group-hover:text-red-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-8 transition-all duration-300 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-neutral-400 hover:text-neutral-200" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-500 font-medium">
              <Shield className="w-4 h-4" />
              <span>Worker Portal</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-neutral-200">Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-neutral-400 text-sm">
              <Search className="w-4 h-4 text-neutral-500" />
              <span className="opacity-60 text-xs">Search...</span>
              <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono">⌘K</kbd>
            </div>
            <button className="relative p-2 text-neutral-400 hover:text-neutral-200 transition-colors rounded-full hover:bg-white/[0.04]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#0a0a0a]" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 pt-4 pb-20">
          {children}
        </div>
      </main>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="fixed inset-y-0 left-0 w-[260px] bg-[#0a0a0a] border-r border-white/10 z-50 flex flex-col lg:hidden shadow-2xl">
              <div className="h-16 flex items-center px-6 border-b border-white/[0.04]">
                <span className="font-bold text-sm tracking-widest uppercase text-neutral-200">Suraksha</span>
              </div>
              <nav className="flex-1 px-3 py-6 space-y-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <span className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium \${pathname === item.href ? 'text-white bg-white/[0.04]' : 'text-neutral-400'}`}>
                      <item.icon className={`w-4 h-4 \${pathname === item.href ? 'text-emerald-400' : 'text-neutral-500'}`} />
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}