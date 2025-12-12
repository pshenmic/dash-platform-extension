import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface TransactionFieldRowProps {
  label: string
  value: string | number | null
  className?: string
}

export function TransactionFieldRow ({ label, value, className = '' }: TransactionFieldRowProps): React.JSX.Element {
  if (value == null) return <></>

  return (
    <div className={`flex justify-between items-center ${className}`}>
      <Text size='sm' className='opacity-50'>{label}</Text>
      <Text size='sm' weight='medium'>{String(value)}</Text>
    </div>
  )
}
