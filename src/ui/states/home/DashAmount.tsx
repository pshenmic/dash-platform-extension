import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface DashAmountProps {
  /** Null while the amount is unknown, rendered as a dash instead of a number. */
  whole: string | null
  fraction: string
  hide: boolean
  className?: string
}

export function DashAmount ({ whole, fraction, hide, className }: DashAmountProps): React.JSX.Element {
  if (hide) {
    return <Text as='span' className={className}>••••••</Text>
  }

  if (whole == null) {
    return <Text as='span' className={className}><span className='font-extrabold'>-</span></Text>
  }

  return (
    <Text as='span' className={className}>
      <span className='font-extrabold'>{whole}</span>
      <span className='font-medium'>.{fraction} Dash</span>
    </Text>
  )
}

interface FiatChipProps {
  /** Null while the rate is unknown, rendered as a dash instead of a number. */
  label: string | null
  hide: boolean
  className?: string
  textClassName?: string
}

export function FiatChip ({ label, hide, className, textClassName }: FiatChipProps): React.JSX.Element {
  return (
    <div className={`flex rounded-full backdrop-blur-[4px] ${className ?? ''}`}>
      <Text size='xs' weight='medium' className={textClassName}>
        {hide ? '~ ••• USD' : (label ?? '-')}
      </Text>
    </div>
  )
}
