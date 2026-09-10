import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { DashAmount, FiatChip } from './DashAmount'
import { DASHBOARD_MOCK } from './mock'
import { BalanceActions } from '../../components/common'

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
        <BalanceActions variant='subtle' hide={hideBalance} onToggleHide={onToggleHide} onRefresh={onRefresh} />
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
