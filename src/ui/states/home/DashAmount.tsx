import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { InlineSpinner } from '../../components/common'

interface DashAmountProps {
  /** Null when the amount is unknown - nothing has loaded yet. */
  whole: string | null
  fraction: string
  hide: boolean
  /** Some part of the amount is still loading, the value shown is partial. */
  loading?: boolean
  className?: string
  spinnerClassName?: string
}

export function DashAmount ({
  whole,
  fraction,
  hide,
  loading = false,
  className,
  spinnerClassName
}: DashAmountProps): React.JSX.Element {
  if (hide) {
    return <Text as='span' className={className}>••••••</Text>
  }

  if (whole == null) {
    return loading
      ? <InlineSpinner className={spinnerClassName} />
      : <Text as='span' className={className}><span className='font-extrabold'>-</span></Text>
  }

  return (
    <span className='inline-flex items-center gap-2 min-w-0'>
      <Text as='span' className={className}>
        <span className='font-extrabold'>{whole}</span>
        <span className='font-medium'>.{fraction} Dash</span>
      </Text>
      {loading && <InlineSpinner className={spinnerClassName} />}
    </span>
  )
}

interface FiatChipProps {
  /** Null when the fiat value is unknown, rendered as a dash instead of a number. */
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
