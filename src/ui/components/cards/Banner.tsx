import React from 'react'
import { ValueCard, Text } from 'dash-ui-kit/react'

interface BannerProps {
  message?: string | null
  variant: 'error' | 'info'
  className?: string
}

export default function Banner ({ message, variant, className }: BannerProps): React.JSX.Element | null {
  if (message == null || message === '') return null

  const colorScheme = variant === 'error' ? 'yellow' : 'lightBlue'
  const textColor = variant === 'error' ? 'red' : undefined

  return (
    <ValueCard colorScheme={colorScheme} className={className ?? ''}>
      <Text color={textColor} className='whitespace-normal w-full [overflow-wrap:anywhere]'>{message}</Text>
    </ValueCard>
  )
}
