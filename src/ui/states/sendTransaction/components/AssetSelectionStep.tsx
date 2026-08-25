import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { AssetOptionCard, formatAssetBalance } from '../../../components/controls'
import type { AssetOption } from '../../../components/controls'

export interface AssetSelectionStepProps {
  assetOptions: AssetOption[]
  balance: bigint | null
  onSelect: (assetValue: string) => void
}

/**
 * Initial "what do you want to send?" step, shown when the identity holds
 * tokens and no asset has been chosen yet.
 */
export function AssetSelectionStep ({ assetOptions, balance, onSelect }: AssetSelectionStepProps): React.JSX.Element {
  return (
    <div className='screen-content'>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <Text className='text-dash-primary-dark-blue !text-[2.5rem] !font-medium !leading-[1.25] tracking-[-0.03em]'>
            Transfer
          </Text>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
            What do you want to send?
          </Text>
        </div>

        <div className='flex flex-col gap-2.5'>
          {assetOptions.map((option) => (
            <AssetOptionCard
              key={option.value}
              variant='plain'
              icon={option.icon}
              label={option.label}
              symbol={option.symbol}
              balance={formatAssetBalance(option, balance != null ? balance.toString() : undefined)}
              onClick={() => onSelect(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
