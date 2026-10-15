import React from 'react'

interface BellIconProps {
  color?: string
  size?: number
  className?: string
}

// Bell outline in the style of the dash-ui-kit icons.
export function BellIcon ({ color = '#0C1C33', size = 24, className = '' }: BellIconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className={className} color={color} aria-hidden='true'>
      <path d='M12 4.5C9.24 4.5 7 6.74 7 9.5V12.9L5.5 15.4V16.5H18.5V15.4L17 12.9V9.5C17 6.74 14.76 4.5 12 4.5Z' stroke='currentColor' strokeWidth='1.07' strokeLinejoin='round' />
      <path d='M10 18.75C10.3 19.6 11.08 20.2 12 20.2C12.92 20.2 13.7 19.6 14 18.75' stroke='currentColor' strokeWidth='1.07' strokeLinecap='round' />
    </svg>
  )
}
