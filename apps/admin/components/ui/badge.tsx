import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Supported badge visual variants.
 * Each maps to a distinct Tailwind color combination.
 */
export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'secondary'
  | 'outline'
  | 'orange';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-indigo-100 text-indigo-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-800',
  destructive: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  secondary: 'bg-slate-100 text-slate-700',
  outline: 'border border-slate-300 text-slate-700 bg-transparent',
};

/**
 * Inline status badge with configurable color variant.
 * Pure Tailwind — no Radix dependency.
 */
export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
