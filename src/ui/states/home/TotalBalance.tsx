import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { DashAmount, FiatChip } from './DashAmount'
import { duffsToDashParts, duffsToFiatLabel } from './amount'
import { BalanceActions } from '../../components/common'

interface TotalBalanceProps {
  hideBalance: boolean
  /** Core plus Platform in duffs, set only once both requests are done. Null until then. */
  totalDuffs: bigint | null
  rate: number | null
  /** Core or Platform is still loading, so the spinner replaces the total. */
  loading: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

export function TotalBalance ({
  hideBalance,
  totalDuffs,
  rate,
  loading,
  onToggleHide,
  onRefresh
}: TotalBalanceProps): React.JSX.Element {
  const parts = totalDuffs != null ? duffsToDashParts(totalDuffs) : null
  const fiat = totalDuffs != null ? duffsToFiatLabel(totalDuffs, rate) : null

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
          whole={parts?.whole ?? null}
          fraction={parts?.fraction ?? ''}
          hide={hideBalance}
          loading={loading}
          className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
          spinnerClassName='w-7 h-7 text-dash-brand'
        />
        {/* The amount already carries a spinner, so the chip only appears once it has a value. */}
        {(hideBalance || fiat != null) && (
          <FiatChip
            label={fiat}
            hide={hideBalance}
            className='bg-white px-2 py-[5px] shadow-[0_0_48px_0_rgba(12,28,51,0.08)]'
            textClassName='!text-dash-brand !text-sm !leading-[1.2]'
          />
        )}
      </div>
    </div>
  )
}
