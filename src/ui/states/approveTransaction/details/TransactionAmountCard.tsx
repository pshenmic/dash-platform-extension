import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { CreditsIcon, Text } from 'dash-ui-kit/react'
import { FiatChip } from '../../../components/common'
import { useDashRate } from '../../../hooks'
import { PLATFORM_DASH_DECIMALS, dashAmountToUsd, formatDashAmount } from '../../../../utils'
import type { OutletContext } from '../../../types'

interface TransactionAmountCardProps {
  label: string
  credits: string
  // Detail rows shown under the amount inside the same card.
  children?: React.ReactNode
}

/** Card with the amount in Dash, its USD value and exact credits, followed by the transaction rows. */
export function TransactionAmountCard ({ label, credits, children }: TransactionAmountCardProps): React.JSX.Element {
  const { currentNetwork } = useOutletContext<OutletContext>()
  const { rate } = useDashRate(currentNetwork)
  const amount = BigInt(credits)

  return (
    <div className='flex flex-col px-4 py-3.5 rounded-3xl bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2] [overflow-wrap:anywhere]'>
            {formatDashAmount(amount, PLATFORM_DASH_DECIMALS)}{' '}
            <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>Dash</Text>
          </Text>
          <FiatChip
            label={dashAmountToUsd(amount, PLATFORM_DASH_DECIMALS, rate)}
            hide={false}
            className='bg-dash-brand/10 px-2 py-[3px]'
            textClassName='!text-dash-brand'
          />
        </div>
        <div className='flex items-center gap-1.5 min-w-0'>
          <CreditsIcon size={12} className='shrink-0' />
          <Text size='xs' weight='medium' dim className='truncate'>{label} · {amount.toLocaleString()} Credits</Text>
        </div>
      </div>

      {children != null && (
        <div className='flex flex-col mt-3 pt-1 border-t border-dash-primary-dark-blue/5'>
          {children}
        </div>
      )}
    </div>
  )
}
