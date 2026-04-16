import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'warning' | 'success' | 'neutral';
  size?: 'sm' | 'md';
  status?: 'ACTIVE' | 'LAPSED' | 'IN_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CRITICAL' | 'PENDING';
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    variant, 
    size = 'md', 
    status, 
    dot = false, 
    pulse = false,
    children, 
    className = '', 
    ...props 
  }, ref) => {
    // Status-based styling takes precedence over variant
    const getStatusStyles = () => {
      switch (status) {
        case 'ACTIVE':
          return {
            bg: 'bg-green-100 text-green-800',
            dotColor: 'bg-green-500',
            pulse: false
          };
        case 'LAPSED':
          return {
            bg: 'bg-gray-100 text-gray-800',
            dotColor: 'bg-gray-500',
            pulse: false
          };
        case 'IN_REVIEW':
          return {
            bg: 'bg-amber-100 text-amber-800',
            dotColor: 'bg-amber-500',
            pulse: false
          };
        case 'APPROVED':
          return {
            bg: 'bg-blue-100 text-blue-800',
            dotColor: 'bg-blue-500',
            pulse: false
          };
        case 'PAID':
          return {
            bg: 'bg-green-100 text-green-800',
            dotColor: 'bg-green-500',
            pulse: false
          };
        case 'REJECTED':
          return {
            bg: 'bg-red-100 text-red-800',
            dotColor: 'bg-red-500',
            pulse: false
          };
        case 'CRITICAL':
          return {
            bg: 'bg-red-100 text-red-800',
            dotColor: 'bg-red-500',
            pulse: true
          };
        case 'PENDING':
          return {
            bg: 'bg-gray-100 text-gray-800',
            dotColor: 'bg-gray-500',
            pulse: false
          };
        default:
          return null;
      }
    };

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            bg: 'bg-brand-primary/10 text-brand-primary',
            dotColor: 'bg-brand-primary'
          };
        case 'secondary':
          return {
            bg: 'bg-brand-secondary/10 text-brand-secondary',
            dotColor: 'bg-brand-secondary'
          };
        case 'accent':
          return {
            bg: 'bg-brand-accent/10 text-brand-accent',
            dotColor: 'bg-brand-accent'
          };
        case 'danger':
          return {
            bg: 'bg-brand-danger/10 text-brand-danger',
            dotColor: 'bg-brand-danger'
          };
        case 'warning':
          return {
            bg: 'bg-brand-warning/10 text-brand-warning',
            dotColor: 'bg-brand-warning'
          };
        case 'success':
          return {
            bg: 'bg-green-100 text-green-800',
            dotColor: 'bg-green-500'
          };
        case 'neutral':
        default:
          return {
            bg: 'bg-gray-100 text-gray-800',
            dotColor: 'bg-gray-500'
          };
      }
    };

    const statusStyles = getStatusStyles();
    const variantStyles = getVariantStyles();
    const styles = statusStyles || variantStyles;
    const shouldPulse = status === 'CRITICAL' || pulse;

    const baseStyles = 'inline-flex items-center font-medium rounded-full';
    
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm'
    };

    const dotStyles = dot ? 'gap-1.5' : '';
    const pulseAnimation = shouldPulse ? 'animate-pulse' : '';

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${styles.bg} ${sizeStyles[size]} ${dotStyles} ${pulseAnimation} ${className}`}
        {...props}
      >
        {dot && (
          <span 
            className={`w-1.5 h-1.5 rounded-full ${styles.dotColor} ${shouldPulse ? 'animate-pulse' : ''}`}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
