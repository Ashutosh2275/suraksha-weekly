import { PropsWithChildren } from "react";
import { cn } from "@/components/common/cn";

interface CardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function Card({ title, description, className, action, children }: CardProps) {
  return (
    <section className={cn("rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs text-[var(--color-text-soft)]">{description}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
