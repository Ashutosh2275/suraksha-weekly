'use client'

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'card' | 'button'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  lines = 1,
  className = '' 
}: SkeletonProps) {
  const baseStyles = 'animate-shimmer bg-gradient-to-r from-surface-subtle via-border-default to-surface-subtle bg-[length:200%_100%]'

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded-full ${baseStyles} ${className}`}
            style={{
              width: width || `${100 - i * 5}%`,
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'circle') {
    return (
      <div
        className={`rounded-full ${baseStyles} ${className}`}
        style={{
          width: width || height || 48,
          height: height || width || 48,
        }}
      />
    )
  }

  if (variant === 'button') {
    return (
      <div
        className={`rounded-md ${baseStyles} ${className}`}
        style={{
          width: width || 120,
          height: height || 40,
        }}
      />
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={`rounded-lg p-6 border border-border-default ${baseStyles} ${className}`}
        style={{
          width,
          height: height || 200,
        }}
      >
        <div className="space-y-4">
          <div className={`h-6 rounded-full ${baseStyles} w-3/4`} />
          <div className={`h-4 rounded-full ${baseStyles} w-full`} />
          <div className={`h-4 rounded-full ${baseStyles} w-5/6`} />
          <div className={`h-10 rounded-md ${baseStyles} w-1/3 mt-6`} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${baseStyles} ${className}`}
      style={{
        width,
        height,
      }}
    />
  )
}
