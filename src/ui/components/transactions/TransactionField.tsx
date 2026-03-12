import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'

interface TransactionFieldProps {
  label: string
  value: string | number | null
  valueType?: 'text' | 'identifier'
  className?: string
}

export function TransactionField ({ label, value, valueType = 'text', className = '' }: TransactionFieldProps): React.JSX.Element {
  if (value == null) return <></>

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <Text size='sm' className='opacity-50'>{label}</Text>
      {valueType === 'identifier'
        ? (
          <Identifier>{String(value)}</Identifier>
          )
        : (
          <Text size='sm' weight='medium'>{String(value)}</Text>
          )}
    </div>
  )
}
