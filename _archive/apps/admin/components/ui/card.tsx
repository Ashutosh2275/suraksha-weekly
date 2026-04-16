import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

/**
 * Container card with a subtle border and shadow.
 * Pure Tailwind — no Radix dependency.
 */
export function Card({ className, ...props }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  );
}

/** Padded header section of a Card. */
export function CardHeader({ className, ...props }: CardHeaderProps): React.JSX.Element {
  return <div className={cn('p-6 pb-3', className)} {...props} />;
}

/** Padded content section of a Card (top padding removed — header handles gap). */
export function CardContent({ className, ...props }: CardContentProps): React.JSX.Element {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

/** Primary heading inside a CardHeader. */
export function CardTitle({ className, ...props }: CardTitleProps): React.JSX.Element {
  return (
    <h3 className={cn('text-base font-semibold text-slate-900 leading-none', className)} {...props} />
  );
}

/** Secondary description text inside a CardHeader. */
export function CardDescription({ className, ...props }: CardDescriptionProps): React.JSX.Element {
  return <p className={cn('text-sm text-slate-500 mt-1', className)} {...props} />;
}
