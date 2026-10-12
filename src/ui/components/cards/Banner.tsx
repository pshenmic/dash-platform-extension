import React from 'react'
import { ValueCard, Text } from 'dash-ui-kit/react'

interface BannerProps {
  message?: string | null
  // Rich content shown instead of the message text.
  children?: React.ReactNode
  variant: 'error' | 'warning' | 'info'
  className?: string
}

export default function Banner ({ message, children, variant, className }: BannerProps): React.JSX.Element | null {
  if (children == null && (message == null || message === '')) return null

  const colorScheme = variant === 'info' ? 'lightBlue' : 'yellow'
  const textColor = variant === 'error' ? 'red' : undefined

  return (
    <ValueCard colorScheme={colorScheme} className={className ?? ''}>
      {children ?? <Text color={textColor} className='whitespace-normal w-full [overflow-wrap:anywhere]'>{message}</Text>}
    </ValueCard>
  )
}
