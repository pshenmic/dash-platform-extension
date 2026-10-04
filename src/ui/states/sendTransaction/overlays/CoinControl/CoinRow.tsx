import React from 'react'
import { CheckmarkIcon, Identifier, Text } from 'dash-ui-kit/react'
import { FiatChip } from '../../../../components/common'
import { dashAmountToUsd, formatDashAmount } from '../../../../../utils'

interface CoinRowProps {
  address: string
  amount: bigint
  decimals: number
  rate: number | null
  selected: boolean
  meta?: string
  onToggle: () => void
  children?: React.ReactNode
}

// Selectable Coin Control row: round check, address, amount with USD and optional extra content.
export function CoinRow ({ address, amount, decimals, rate, selected, meta, onToggle, children }: CoinRowProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-3 p-3 rounded-[1rem] transition-colors ${selected ? 'bg-dash-brand/[0.07]' : 'bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'}`}>
      <button type='button' role='checkbox' aria-checked={selected} onClick={onToggle} className='flex items-center gap-3 w-full text-left cursor-pointer'>
        <span className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-full ${selected ? 'bg-dash-brand/15 text-dash-brand' : 'bg-dash-primary-dark-blue/10'}`}>
          {selected && <CheckmarkIcon size={10} color='currentColor' />}
        </span>
        <span className='flex flex-col gap-1 flex-1 min-w-0'>
          <Identifier highlight='both' middleEllipsis edgeChars={8} className='!text-xs'>{address}</Identifier>
          <span className='flex items-center gap-2 flex-wrap'>
            <Text size='xs'><span className='font-bold'>{formatDashAmount(amount, decimals)}</span> Dash</Text>
            <FiatChip label={dashAmountToUsd(amount, decimals, rate)} hide={false} className='bg-dash-brand/10 px-2 py-[2px]' textClassName='!text-dash-brand' />
            {meta != null && <Text size='xs' dim className='ml-auto'>{meta}</Text>}
          </span>
        </span>
      </button>
      {children}
    </div>
  )
}
