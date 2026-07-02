import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { SelectableCard } from './SelectableCard'

interface AssetOptionCardProps {
  icon: React.ReactNode
  label: string
  symbol?: string
  balance?: string
  // 'selectable' shows a selected/unselected state (SelectableCard). 'plain' is a
  // neutral clickable card with no pre-selected highlight — for an initial choice.
  variant?: 'selectable' | 'plain'
  selected?: boolean
  onClick: () => void
}

// An asset row (icon + name + symbol badge + balance). Shared by the
// asset-selection menu and the transfer asset step.
export const AssetOptionCard: React.FC<AssetOptionCardProps> = ({
  icon,
  label,
  symbol,
  balance,
  variant = 'selectable',
  selected = false,
  onClick
}) => {
  const row = (
    <div className='flex items-center justify-between w-full gap-3'>
      <div className='flex items-center gap-3'>
        {icon}
        <div className='flex items-center gap-2'>
          <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
            {label}
          </Text>
          {symbol != null && (
            <div className='flex bg-dash-brand/10 rounded px-[5px] py-[3px]'>
              <Text size='xs' weight='medium' className='text-dash-brand !text-[10px] leading-[1.366]'>
                {symbol}
              </Text>
            </div>
          )}
        </div>
      </div>
      {balance != null && (
        <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
          {balance}
        </Text>
      )}
    </div>
  )

  if (variant === 'plain') {
    return (
      <button
        type='button'
        onClick={onClick}
        className='w-full rounded-2xl px-6 py-3 border border-dash-primary-dark-blue/15 bg-white hover:border-dash-brand/50 hover:bg-dash-primary-dark-blue/[0.03] transition-all cursor-pointer'
      >
        {row}
      </button>
    )
  }

  return (
    <SelectableCard selected={selected} onClick={onClick}>
      {row}
    </SelectableCard>
  )
}
