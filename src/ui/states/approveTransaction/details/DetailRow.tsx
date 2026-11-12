import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface DetailRowProps {
  label: string
  value: React.ReactNode
}

/** Borderless label and value row used inside the transaction card. */
export function DetailRow ({ label, value }: DetailRowProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3 py-2'>
      <Text size='xs' weight='medium' dim className='shrink-0'>{label}</Text>
      <div className='flex items-center justify-end min-w-0 text-right'>
        {typeof value === 'string' || typeof value === 'number'
          ? <Text size='xs' weight='medium' className='truncate'>{value}</Text>
          : value}
      </div>
    </div>
  )
}
