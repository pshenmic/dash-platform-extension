import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { LayerBadge, type LayerType } from '../controls'
import { FiatChip, Skeleton } from '../common'

interface BalanceCardProps {
  layer: LayerType
  amount: string
  unit?: string
  usd?: string | null
  label?: string
  loading?: boolean
  className?: string
}

/** Balance of the selected source shown under the amount input. */
export function BalanceCard ({
  layer,
  amount,
  unit = 'Dash',
  usd,
  label = 'Balance:',
  loading = false,
  className
}: BalanceCardProps): React.JSX.Element {
  return (
    <ValueCard colorScheme='lightGray' size='md' border={false} className={`flex items-center gap-3 ${className ?? ''}`}>
      <LayerBadge layer={layer} />
      <div className='flex flex-col flex-1 min-w-0'>
        <Text size='xs' dim className='!leading-[1.3]'>
          {label}
        </Text>
        {loading
          ? <Skeleton className='h-3.5 w-20 my-[1px]' />
          : (
            <Text size='sm' className='truncate !leading-[1.3]'>
              <span className='font-bold'>{amount}</span> {unit}
            </Text>
            )}
      </div>
      {!loading && usd != null && (
        <FiatChip
          label={usd}
          hide={false}
          className='bg-dash-brand/[0.15] px-2 py-[5px]'
          textClassName='!text-[10px] !leading-[1.2] !text-dash-brand'
        />
      )}
    </ValueCard>
  )
}
