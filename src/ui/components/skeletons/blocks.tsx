import React from 'react'
import { Skeleton, StatCardSkeleton } from '../common'
import { TransactionRowSkeleton } from '../transactions/TransactionRow'

const plateClassName = 'bg-[rgba(12,28,51,0.04)]'

/** Balance caption with the big amount under it, as on the Home and Identity pages. */
export function BalanceHeadingSkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3'>
      <Skeleton className='h-[18px] w-36' />
      <Skeleton className='h-9 w-[200px]' />
    </div>
  )
}

/** Centered balance plate of the Core and Platform pages. */
export function BalancePlateSkeleton ({ className = 'rounded-[14px]' }: { className?: string }): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center gap-3.5 p-[15px] ${plateClassName} ${className}`}>
      <Skeleton className='h-[18px] w-44' />
      <Skeleton className='h-9 w-[180px]' />
      <Skeleton className='h-6 w-28 !rounded-full' />
    </div>
  )
}

/** Transactions, Send and Receive buttons. */
export function ActionRowSkeleton (): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 w-full'>
      <Skeleton className='h-[3.375rem] w-[8.5rem] shrink-0 !rounded-2xl' />
      <Skeleton className='h-[3.375rem] flex-1 !rounded-2xl' />
      <Skeleton className='h-[3.375rem] flex-1 !rounded-2xl' />
    </div>
  )
}

export function SectionTitleSkeleton (): React.JSX.Element {
  return <Skeleton className='h-5 w-40' />
}

export function TabsSkeleton ({ count = 3 }: { count?: number }): React.JSX.Element {
  return (
    <div className='flex gap-4 pb-3 border-b border-dash-primary-dark-blue/10'>
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className='h-4 w-20' />)}
    </div>
  )
}

export function TransactionRowsSkeleton ({ count = 3 }: { count?: number }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      {Array.from({ length: count }, (_, index) => <TransactionRowSkeleton key={index} />)}
    </div>
  )
}

export function LastTransactionSkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-full bg-white shrink-0' />
        <Skeleton className='h-3.5 w-28' />
      </div>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-[1.2rem] w-32' />
        <Skeleton className='h-2.5 w-full' />
      </div>
    </div>
  )
}

/** Two StatCards side by side. */
export function StatRowSkeleton ({ withHint = false }: { withHint?: boolean }): React.JSX.Element {
  return (
    <div className='flex gap-3 w-full'>
      <StatCardSkeleton withHint={withHint} />
      <StatCardSkeleton withHint={withHint} />
    </div>
  )
}
