import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { fromBaseUnit } from '../../../utils/bigintUtils'
import type { GetCoreBalanceResponse } from '../../../types/messages/response/GetCoreBalanceResponse'
import { useStaticAsset } from '../../hooks'
import { DashAmount } from '../home/DashAmount'
import { BalanceActions } from '../../components/common'

interface CoreBalanceProps {
  balance: GetCoreBalanceResponse | null
  loading: boolean
  rate: number | null
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

const bagelClassName = 'pointer-events-none absolute max-w-none h-auto select-none'

export function CoreBalance ({ balance, loading, rate, hide, onToggleHide, onRefresh }: CoreBalanceProps): React.JSX.Element {
  const bagel = useStaticAsset('coin_bagel.png')

  // Core amounts arrive in duffs (10^8), never in credits.
  const dash = balance != null ? fromBaseUnit(balance.balance, 8) : null
  const [whole, fraction = '00'] = (dash ?? '').split('.')
  const fiat = dash != null && rate != null
    ? `~ $${(Number(dash) * rate).toFixed(2)} USD`
    : null

  return (
    <div className='relative overflow-hidden rounded-[14px] px-[15px] py-[15px] bg-[rgba(12,28,51,0.04)]'>
      <img
        src={bagel}
        alt=''
        className={`${bagelClassName} top-[-94%] left-[-65%] w-[300px] opacity-100`}
      />
      <img
        src={bagel}
        alt=''
        className={`${bagelClassName} top-[-122%] right-[-48%] w-[300px] opacity-90`}
      />
      <div className='relative z-10 flex flex-col items-center gap-3.5'>
        <div className='flex flex-col items-center gap-2'>
          <Text size='lg' weight='medium' className='!leading-none !tracking-[-0.03em]'>
            Total <span className='text-dash-brand'>Core</span> Balance:
          </Text>
          <div className='flex items-center gap-3'>
            {dash == null
              ? (
                <div
                  className={`h-9 w-[180px] rounded-lg bg-dash-primary-dark-blue/10 ${loading ? 'animate-pulse' : ''}`}
                  aria-hidden='true'
                />
                )
              : (
                <DashAmount
                  whole={whole}
                  fraction={fraction}
                  hide={hide}
                  className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
                />
                )}
            <BalanceActions hide={hide} onToggleHide={onToggleHide} onRefresh={onRefresh} />
          </div>
        </div>
        {fiat != null && (
          <Text size='sm' weight='medium' className='!leading-[1.2] !text-dash-brand'>
            {hide ? '~ ••• USD' : fiat}
          </Text>
        )}
      </div>
    </div>
  )
}
