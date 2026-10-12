import React from 'react'
import { Skeleton } from '../common'
import { ActionRowSkeleton, BalanceHeadingSkeleton, LastTransactionSkeleton, SectionTitleSkeleton, StatRowSkeleton } from './blocks'

function LayerCardSkeleton ({ toneClassName }: { toneClassName: string }): React.JSX.Element {
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-5 p-4 rounded-[14px] ${toneClassName}`}>
      <Skeleton className='h-3.5 w-16' colorClassName='bg-white/20' />
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-3 w-14' colorClassName='bg-white/15' />
        <Skeleton className='h-4 w-24' colorClassName='bg-white/20' />
        <Skeleton className='h-[22px] w-20 !rounded-full' colorClassName='bg-white/15' />
      </div>
    </div>
  )
}

/** Wallet dashboard stand-in while the page or its access check loads. */
export function HomeSkeleton (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6' aria-busy='true' aria-label='Loading'>
      <BalanceHeadingSkeleton />
      <div className='flex gap-2 w-full'>
        <LayerCardSkeleton toneClassName='bg-[#4C7EFF]' />
        <LayerCardSkeleton toneClassName='bg-[#0C1C33]' />
      </div>
      <ActionRowSkeleton />
      <div className='flex flex-col gap-4'>
        <SectionTitleSkeleton />
        <LastTransactionSkeleton />
        <StatRowSkeleton withHint />
      </div>
    </div>
  )
}
