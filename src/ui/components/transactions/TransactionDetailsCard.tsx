import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'

interface TransactionDetailsCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function TransactionDetailsCard ({ title, children, className }: TransactionDetailsCardProps): React.JSX.Element {
  return (
    <ValueCard colorScheme='white' size='xl' border={false} className={`dash-shadow-lg !p-4 ${className ?? ''}`}>
      <div className='flex flex-col gap-2.5 w-full'>
        <Text size='md' dim>{title}</Text>
        {children}
      </div>
    </ValueCard>
  )
}
