import React from 'react'
import { CircleProcessIcon } from 'dash-ui-kit/react'

interface InlineSpinnerProps {
  className?: string
}

/** Small spinning icon shown next to a value that is still being loaded. */
export function InlineSpinner ({ className }: InlineSpinnerProps): React.JSX.Element {
  return (
    <CircleProcessIcon
      aria-label='Loading'
      className={`animate-spin shrink-0 ${className ?? 'w-4 h-4 text-dash-brand'}`}
    />
  )
}
