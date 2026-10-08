import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface SummaryRowProps {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}

/** Rounded row with a label on the left (muted when given as text) and a value on the right. */
export function SummaryRow ({ label, value, className }: SummaryRowProps): React.JSX.Element {
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-3.5 rounded-[0.9375rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5 ${className ?? ''}`}>
      {typeof label === 'string'
        ? <Text weight='medium' className='shrink-0 !text-xs' dim>{label}</Text>
        : <div className='shrink-0'>{label}</div>}
      <div className='flex items-center justify-end gap-2 min-w-0 text-right'>
        {typeof value === 'string' || typeof value === 'number'
          ? <Text size='xs' weight='medium' className='truncate'>{value}</Text>
          : value}
      </div>
    </div>
  )
}
