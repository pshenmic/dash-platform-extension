import React from 'react'

interface SkeletonProps {
  /** Size, shape and layout of the placeholder. */
  className?: string
  /** Fill color; blocks on colored cards pass a lighter one. */
  colorClassName?: string
}

/** Pulsing placeholder that stands in for content until it loads. */
export function Skeleton ({ className, colorClassName = 'bg-dash-primary-dark-blue/10' }: SkeletonProps): React.JSX.Element {
  return <span aria-hidden='true' className={`block animate-pulse rounded-lg ${colorClassName} ${className ?? ''}`} />
}

/** Skeleton sized to the surrounding text line, for use inside a Text. */
export function TextSkeleton ({ className, colorClassName }: SkeletonProps): React.JSX.Element {
  return <Skeleton className={`!inline-block align-middle h-[1em] ${className ?? 'w-[4em]'}`} colorClassName={colorClassName} />
}
