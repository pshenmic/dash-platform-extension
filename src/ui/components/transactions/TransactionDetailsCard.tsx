import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'

interface TransactionDetailsCardProps {
  title: string
  titleRight?: string
  children: React.ReactNode
  className?: string
}

export function TransactionDetailsCard ({ title, titleRight, children, className }: TransactionDetailsCardProps): React.JSX.Element {
  return (
    <ValueCard
      colorScheme='white'
      size='xl'
      border={false}
      className={`!rounded-[1.25rem] shadow-[0_0_25px_0_rgba(0,0,0,0.05)] !p-[0.9375rem] ${className ?? ''}`}
    >
      <div className='flex flex-col gap-2.5 w-full'>
        <div className='flex items-center justify-between'>
          <Text className='!text-[1rem] !font-medium text-dash-primary-dark-blue opacity-50'>{title}</Text>
          {titleRight != null && (
            <Text className='!text-[0.75rem] !font-medium text-dash-primary-dark-blue opacity-50'>{titleRight}</Text>
          )}
        </div>
        {children}
      </div>
    </ValueCard>
  )
}
