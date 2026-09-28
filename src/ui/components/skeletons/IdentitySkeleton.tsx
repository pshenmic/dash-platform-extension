import React from 'react'
import { Skeleton } from '../common'
import {
  ActionRowSkeleton,
  BalanceHeadingSkeleton,
  SectionTitleSkeleton,
  StatRowSkeleton,
  TabsSkeleton,
  TransactionRowsSkeleton
} from './blocks'

/** Identity page stand-in while the page or its access check loads. */
export function IdentitySkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6' aria-busy='true' aria-label='Loading'>
      <BalanceHeadingSkeleton />
      <div className='flex items-center gap-2'>
        <Skeleton className='w-6 h-6 shrink-0 !rounded-full' />
        <Skeleton className='h-4 flex-1' />
        <Skeleton className='w-7 h-7 shrink-0' />
        <Skeleton className='w-7 h-7 shrink-0' />
      </div>
      <ActionRowSkeleton />
      <div className='flex flex-col gap-4'>
        <TabsSkeleton />
        <TransactionRowsSkeleton />
        <SectionTitleSkeleton />
        <StatRowSkeleton withHint />
        <StatRowSkeleton />
      </div>
    </div>
  )
}
