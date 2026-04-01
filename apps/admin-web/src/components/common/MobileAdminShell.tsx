"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "@/components/common/cn";

const navItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/review-queue", label: "Queue" },
  { href: "/triggers", label: "Triggers" },
  { href: "/fraud", label: "Fraud" },
  { href: "/audit", label: "Audit" },
];

interface MobileAdminShellProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function MobileAdminShell({ title, subtitle, children }: MobileAdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto max-w-6xl pb-24 md:pb-8">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur md:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Suraksha Admin</p>
          <h1 className="mt-1 text-xl font-semibold leading-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-soft)]">{subtitle}</p> : null}
        </header>

        <section className="px-4 py-4 md:px-6">{children}</section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 p-2 backdrop-blur md:static md:mx-auto md:max-w-6xl md:border-t-0 md:border-b md:px-6 md:pb-2 md:pt-4">
        <ul className="grid grid-cols-5 gap-1 md:flex md:flex-wrap md:gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  className={cn(
                    "flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-medium transition-colors",
                    active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
