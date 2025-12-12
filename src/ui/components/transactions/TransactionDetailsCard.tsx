import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'

interface TransactionDetailsCardProps {
  title: string
  children: React.ReactNode
}

export function TransactionDetailsCard ({ title, children }: TransactionDetailsCardProps): React.JSX.Element {
  return (
    <ValueCard colorScheme='white' size='xl' border={false} className='dash-shadow-lg'>
      <div className='flex flex-col gap-2.5'>
        <Text size='md' weight='medium' dim>{title}</Text>
        {children}
      </div>
    </ValueCard>
  )
}
