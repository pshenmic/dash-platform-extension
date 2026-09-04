import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'

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
    <div className={`flex items-center gap-3 ${className}`}>
      <div className='flex gap-1'>
        <Text className='!text-[0.75rem]' dim>Balance:</Text>
        <Text weight='bold' className='!text-[0.75rem]'>{balance}</Text>
        <Text className='!text-[0.75rem]'>{unit}</Text>
      </div>
      {usdValue != null && (
        <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
          <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
            {usdValue}
          </Text>
        </ValueCard>
      )}
    </div>
  )
}
