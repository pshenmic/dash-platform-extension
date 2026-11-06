import React from 'react'
import { Text } from 'dash-ui-kit/react'

/** Brand pill with the transaction type, shown next to the screen title. */
export function TransactionTypeChip ({ title }: { title: string }): React.JSX.Element {
  return (
    <div className='inline-flex items-center shrink-0 h-7 px-3 rounded-full bg-dash-brand/10'>
      <Text size='xs' weight='bold' className='!text-dash-brand !leading-none whitespace-nowrap'>{title}</Text>
    </div>
  )
}
