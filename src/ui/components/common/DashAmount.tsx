import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { InlineSpinner } from './InlineSpinner'
import { amountFractionScale } from '../../../utils'

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

  // Long amounts get a smaller fraction so the balance stays narrow.
  const fractionScale = amountFractionScale(whole, fraction)

  return (
    <span className='inline-flex items-center gap-2 min-w-0'>
      <Text as='span' className={className}>
        <span className='font-extrabold'>{whole}</span>
        <span className='font-medium' style={{ fontSize: `${fractionScale}em` }}>.{fraction} Dash</span>
      </Text>
      {loading && <InlineSpinner className={spinnerClassName} />}
    </span>
  )
}
