import React from 'react'
import { StatCardSkeleton } from '../common'
import {
  ActionRowSkeleton,
  BalancePlateSkeleton,
  LastTransactionSkeleton,
  SectionTitleSkeleton,
  StatRowSkeleton,
  TransactionRowsSkeleton
} from './blocks'

/** Core layer page stand-in while the page or its access check loads. */
export function CoreSkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6' aria-busy='true' aria-label='Loading'>
      <BalancePlateSkeleton />
      <ActionRowSkeleton />
      <div className='flex flex-col gap-4'>
        <TransactionRowsSkeleton />
        <SectionTitleSkeleton />
        <div className='flex gap-3 w-full'>
          <StatCardSkeleton withHint />
        </div>
        <StatRowSkeleton />
        <LastTransactionSkeleton />
      </div>
    </div>
  )
}
