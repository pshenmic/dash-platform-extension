import React from 'react'
import { CircleProcessIcon } from 'dash-ui-kit/react'

interface ScreenLoaderProps {
  /** Overrides the default centering box, e.g. to shrink the reserved height. */
  className?: string
}

/** Universal screen loader: a spinner centered in the available area, no caption. */
export default function ScreenLoader ({ className }: ScreenLoaderProps): React.JSX.Element {
  return (
    <div className={`flex items-center justify-center w-full ${className ?? 'flex-1 min-h-[200px]'}`}>
      <CircleProcessIcon
        aria-label='Loading'
        className='animate-spin shrink-0 w-8 h-8 text-dash-brand'
      />
    </div>
  )
}
