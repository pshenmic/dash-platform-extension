import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface DashAmountProps {
  whole: string
  fraction: string
  hide: boolean
  className?: string
}

export function DashAmount ({ whole, fraction, hide, className }: DashAmountProps): React.JSX.Element {
  return (
    <Text as='span' className={className}>
      {hide
        ? '••••••'
        : (
          <>
            <span className='font-extrabold'>{whole}</span>
            <span className='font-medium'>.{fraction} Dash</span>
          </>
          )}
    </Text>
  )
}

interface FiatChipProps {
  label: string
  hide: boolean
  className?: string
  textClassName?: string
}

export function FiatChip ({ label, hide, className, textClassName }: FiatChipProps): React.JSX.Element {
  return (
    <div className={`flex rounded-full backdrop-blur-[4px] ${className ?? ''}`}>
      <Text size='xs' weight='medium' className={textClassName}>
        {hide ? '~ ••• USD' : label}
      </Text>
    </div>
  )
}
