import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'card' | 'rectangle';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
  animate?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    variant = 'text', 
    width, 
    height, 
    lines = 1,
    animate = true,
    className = '', 
    ...props 
  }, ref) => {
    const baseStyles = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';
    const animationStyles = animate ? 'animate-pulse' : '';

    const getVariantStyles = () => {
      switch (variant) {
        case 'text':
          return 'rounded-md h-4';
        case 'circle':
          return 'rounded-full aspect-square';
        case 'card':
          return 'rounded-lg';
        case 'rectangle':
        default:
          return 'rounded-md';
      }
    };

    const getSize = () => {
      const styles: React.CSSProperties = {};
      if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
      if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
      
      // Default sizes for variants
      if (!width && !height) {
        switch (variant) {
          case 'circle':
            styles.width = '48px';
            styles.height = '48px';
            break;
          case 'card':
            styles.width = '100%';
            styles.height = '200px';
            break;
          case 'text':
            styles.width = '100%';
            break;
          case 'rectangle':
            styles.width = '100%';
            styles.height = '32px';
            break;
        }
      }
      
      return styles;
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div ref={ref} className={`space-y-2 ${className}`} {...props}>
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={`${baseStyles} ${getVariantStyles()} ${animationStyles}`}
              style={{
                width: index === lines - 1 ? '75%' : '100%', // Last line is shorter
                ...getSize()
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${getVariantStyles()} ${animationStyles} ${className}`}
        style={getSize()}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
export const SkeletonText = React.forwardRef<HTMLDivElement, { lines?: number; className?: string }>((
  { lines = 3, className = '' },
  ref
) => (
  <Skeleton ref={ref} variant="text" lines={lines} className={className} />
));

SkeletonText.displayName = 'SkeletonText';

export const SkeletonCircle = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>((props, ref) => (
  <Skeleton ref={ref} variant="circle" {...props} />
));

SkeletonCircle.displayName = 'SkeletonCircle';

export const SkeletonCard = React.forwardRef<HTMLDivElement, { className?: string }>((
  { className = '' }, 
  ref
) => (
  <div ref={ref} className={`bg-surface-card rounded-lg shadow-card p-6 ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circle" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

// Complex skeleton layouts for specific use cases
export const SkeletonProfile = React.forwardRef<HTMLDivElement, { className?: string }>((
  { className = '' }, 
  ref
) => (
  <div ref={ref} className={`flex items-start gap-4 ${className}`}>
    <SkeletonCircle width={48} height={48} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </div>
  </div>
));

SkeletonProfile.displayName = 'SkeletonProfile';

export const SkeletonClaimCard = React.forwardRef<HTMLDivElement, { className?: string }>((
  { className = '' }, 
  ref
) => (
  <div ref={ref} className={`p-6 border border-gray-200 rounded-lg space-y-4 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <SkeletonCircle width={24} height={24} />
        <Skeleton variant="text" width="120px" />
      </div>
      <Skeleton variant="text" width="80px" />
    </div>
    <Skeleton variant="text" width="100%" />
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width="100px" />
      <Skeleton variant="text" width="60px" />
    </div>
  </div>
));

SkeletonClaimCard.displayName = 'SkeletonClaimCard';
