import React from 'react'
import { EyeClosedIcon, EyeOpenIcon, RefreshIcon, Text } from 'dash-ui-kit/react'
import { DashAmount, FiatChip } from './DashAmount'
import { DASHBOARD_MOCK } from './mock'

interface TotalBalanceProps {
  hideBalance: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

export function TotalBalance ({ hideBalance, onToggleHide, onRefresh }: TotalBalanceProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-3'>
        <Text size='lg' weight='medium' className='!tracking-[-0.03em] !leading-none'>
          Total Balance:
        </Text>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onToggleHide}
            aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
            className='w-6 h-6 flex items-center justify-center rounded-lg bg-[rgba(12,28,51,0.04)] cursor-pointer hover:bg-[rgba(12,28,51,0.1)] transition-colors'
          >
            {hideBalance
              ? <EyeClosedIcon size={12} className='text-dash-primary-dark-blue' />
              : <EyeOpenIcon size={12} className='text-dash-primary-dark-blue' />}
          </button>
          <button
            type='button'
            onClick={onRefresh}
            aria-label='Refresh'
            className='w-6 h-6 flex items-center justify-center rounded-lg bg-[rgba(12,28,51,0.04)] cursor-pointer hover:bg-[rgba(12,28,51,0.1)] transition-colors'
          >
            <RefreshIcon size={12} className='text-dash-primary-dark-blue' />
          </button>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <DashAmount
          whole={DASHBOARD_MOCK.totalDashWhole}
          fraction={DASHBOARD_MOCK.totalDashFraction}
          hide={hideBalance}
          className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
        />
        <FiatChip
          label={DASHBOARD_MOCK.totalFiat}
          hide={hideBalance}
          className='bg-white px-2 py-[5px] shadow-[0_0_48px_0_rgba(12,28,51,0.08)]'
          textClassName='!text-dash-brand !text-sm !leading-[1.2]'
        />
      </div>
    </div>
  )
}
