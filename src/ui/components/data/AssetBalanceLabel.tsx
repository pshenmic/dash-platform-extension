import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { FiatChip } from '../common'

interface AssetBalanceLabelProps {
  balance: string
  // Unit label shown after the amount (e.g. 'Credits' or a token symbol).
  unit: string
  // Optional fiat equivalent (e.g. '~ $1.23'); hidden when null/undefined.
  usdValue?: string | null
  className?: string
}

// "Balance: <amount> <unit>" with an optional fiat-equivalent pill.
export const AssetBalanceLabel: React.FC<AssetBalanceLabelProps> = ({
  balance,
  unit,
  usdValue,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <div className='flex gap-1'>
        <Text className='!text-[0.75rem]' dim>Balance:</Text>
        <Text weight='bold' className='!text-[0.75rem]'>{balance}</Text>
        <Text className='!text-[0.75rem]'>{unit}</Text>
      </div>
      {usdValue != null && (
        <FiatChip label={usdValue} hide={false} className='bg-dash-brand/10 px-2 py-[3px]' textClassName='!text-dash-brand' />
      )}
    </div>
  )
}
