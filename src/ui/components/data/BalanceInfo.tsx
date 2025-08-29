import React from 'react'
import { Text } from 'dash-ui/react'
import { creditsToDash } from '../../../utils'

interface BalanceInfoProps {
  balanceState: { loading: boolean, error: any, data: bigint | null }
  rateState: { loading: boolean, error: any, data: number | null }
}

const BalanceInfo: React.FC<BalanceInfoProps> = ({ balanceState, rateState }) => {
  if (balanceState.error !== null || balanceState.data == null) {
    return null
  }

  const dashAmount = creditsToDash(balanceState.data)
  const hasValidRate = rateState.error === null && rateState.data != null && rateState.data > 0

  return (
    <div className='flex items-center gap-2.5 bg-[rgba(76,126,255,0.1)] rounded-[5px] px-2 py-1.5 w-fit'>
      {hasValidRate && (
        <>
          <Text className='!text-dash-brand font-medium text-sm'>
            {balanceState.loading
              ? '~ Loading...'
              : rateState.loading
                ? '~ ... USD'
                : `~ $${(dashAmount * (rateState.data ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </Text>
          <div className='w-px h-4 bg-[rgba(76,126,255,0.25)]' />
        </>
      )}

      <Text className='!text-dash-brand font-medium text-sm'>
        {balanceState.loading
          ? 'Loading...'
          : `${dashAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Dash`}
      </Text>
    </div>
  )
}

export default BalanceInfo
