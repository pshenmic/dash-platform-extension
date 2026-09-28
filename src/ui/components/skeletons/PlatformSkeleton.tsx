import React from 'react'
import { Skeleton } from '../common'
import {
  ActionRowSkeleton,
  BalancePlateSkeleton,
  LastTransactionSkeleton,
  SectionTitleSkeleton,
  StatRowSkeleton,
  TabsSkeleton,
  TransactionRowsSkeleton
} from './blocks'

function AllocationSliceSkeleton ({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-5 px-[15px] py-3 bg-[rgba(12,28,51,0.04)] ${className}`}>
      <Skeleton className='h-3.5 w-16' />
      <Skeleton className='h-3.5 w-14' />
    </div>
  )
}

/** Platform layer page stand-in while the page or its access check loads. */
export function PlatformSkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6' aria-busy='true' aria-label='Loading'>
      <div className='flex flex-col'>
        <BalancePlateSkeleton className='rounded-t-[14px]' />
        <div className='flex w-full'>
          <AllocationSliceSkeleton className='rounded-bl-[14px]' />
          <AllocationSliceSkeleton />
          <AllocationSliceSkeleton className='rounded-br-[14px]' />
        </div>
      </div>
      <ActionRowSkeleton />
      <div className='flex flex-col gap-4'>
        <TabsSkeleton />
        <TransactionRowsSkeleton />
        <SectionTitleSkeleton />
        <StatRowSkeleton />
        <StatRowSkeleton withHint />
        <LastTransactionSkeleton />
      </div>
    </div>
  )
}
