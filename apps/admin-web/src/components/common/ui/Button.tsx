import { ButtonHTMLAttributes } from "react";
import { cn } from "@/components/common/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)] focus-visible:outline-[var(--color-primary)]",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-[var(--color-border-strong)]",
  ghost:
    "bg-transparent text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-[var(--color-border-strong)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-strong)] focus-visible:outline-[var(--color-danger)]",
};

const sizeClass: Record<ButtonSize, string> = {
  md: "h-11 min-w-11 px-4 text-sm",
  sm: "h-10 min-w-10 px-3 text-sm",
};

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  disabled,
  isLoading = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
      <span>{children}</span>
    </button>
  );
}
