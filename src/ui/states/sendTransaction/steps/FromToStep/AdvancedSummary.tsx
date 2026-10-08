import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { BalanceCard } from '../../../../components/cards'
import { endpointLayer } from '../../../../components/controls'
import { dashAmountToUsd, formatDashAmount } from '../../../../../utils'
import type { EndpointType } from '../../types'
import type { SourceBalance } from '../../hooks/useSourceBalance'
import type { TransferFee } from '../../hooks/useTransferFee'

interface AdvancedSummaryProps {
  fromType: EndpointType
  balance: SourceBalance
  recipientsTotal: bigint
  fee: TransferFee | null
  rate: number | null
  error: string | null
}

// Balance and Transaction Summary cards under the From / To card in Advanced mode.
export function AdvancedSummary ({ fromType, balance, recipientsTotal, fee, rate, error }: AdvancedSummaryProps): React.JSX.Element {
  const { decimals } = balance
  const feeAmount = fee != null && fee.decimals === decimals ? fee.amount : 0n

  return (
    <div className='flex flex-col gap-2.5'>
      <BalanceCard
        layer={endpointLayer(fromType)}
        amount={balance.amount != null ? formatDashAmount(balance.amount, decimals) : ''}
        usd={dashAmountToUsd(balance.amount, decimals, rate)}
        loading={balance.amount == null}
      />

      <div className='flex flex-col gap-3 p-4 rounded-[1rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'>
        <Text size='sm' weight='medium'>Transaction Summary</Text>
        <div className='flex items-end justify-between gap-3'>
          <div className='flex flex-col gap-1.5'>
            <Text size='xs' dim>Recipients Receive: <span className='font-bold text-dash-primary-dark-blue'>{formatDashAmount(recipientsTotal, decimals)}</span> Dash</Text>
            <Text size='xs' dim>Network Fee: <span className='font-bold text-dash-primary-dark-blue'>{fee != null ? formatDashAmount(fee.amount, fee.decimals) : '-'}</span> Dash</Text>
          </div>
          <div className='flex flex-col items-end px-3 py-2 rounded-[0.75rem] bg-dash-brand/10'>
            <Text size='xs' className='!text-dash-brand'>Send Total:</Text>
            <Text size='md' className='!text-dash-brand'><span className='font-bold'>{formatDashAmount(recipientsTotal + feeAmount, decimals)}</span> Dash</Text>
          </div>
        </div>
      </div>

      {error != null && <Text size='xs' className='!text-red-500'>{error}</Text>}
    </div>
  )
}
