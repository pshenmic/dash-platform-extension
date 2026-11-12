import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface TransactionDetailsCardProps {
  title: string
  titleRight?: string
  children: React.ReactNode
  className?: string
}

/** Muted rounded block with a small title above its content, used for transaction detail fields. */
export function TransactionDetailsCard ({ title, titleRight, children, className }: TransactionDetailsCardProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-2 min-w-0 px-3 py-3.5 rounded-[0.9375rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5 ${className ?? ''}`}>
      <div className='flex items-center justify-between gap-2'>
        <Text weight='medium' className='!text-xs' dim>{title}</Text>
        {titleRight != null && (
          <Text weight='medium' className='!text-xs' dim>{titleRight}</Text>
        )}
      </div>
      {children}
    </div>
  )
}
