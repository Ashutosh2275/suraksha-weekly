import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'colored';
  colorScheme?: 'indigo' | 'amber' | 'green' | 'red';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = 'default',
    colorScheme,
    padding = 'md',
    interactive = false,
    children,
    className = '',
    onClick,
    ...props
  }, ref) => {
    const baseStyles = 'bg-surface-card rounded-lg transition-all duration-200';

    const variantStyles = {
      default: 'shadow-card',
      elevated: 'shadow-elevated',
      outlined: 'border border-gray-200 shadow-none',
      colored: getColorSchemeStyles()
    };

    function getColorSchemeStyles() {
      switch (colorScheme) {
        case 'indigo':
          return 'bg-gradient-to-br from-brand-primary/5 to-brand-primary/10 border border-brand-primary/20 shadow-brand/30';
        case 'amber':
          return 'bg-gradient-to-br from-brand-secondary/5 to-brand-secondary/10 border border-brand-secondary/20';
        case 'green':
          return 'bg-gradient-to-br from-brand-accent/5 to-brand-accent/10 border border-brand-accent/20';
        case 'red':
          return 'bg-gradient-to-br from-brand-danger/5 to-brand-danger/10 border border-brand-danger/20';
        default:
          return 'bg-surface-card shadow-card';
      }
    }

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const interactiveStyles = interactive ? 'cursor-pointer hover:shadow-elevated hover:-translate-y-0.5' : '';

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
          onClick={onClick}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', children, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-xl font-display font-semibold text-text-primary ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', children, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-text-secondary mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`mt-6 pt-4 border-t border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
