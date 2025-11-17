import React from 'react'
import { Text, ChevronIcon, Avatar } from 'dash-ui-kit/react'
import type { TokenData } from '../../../types'

interface AssetSelectorBadgeProps {
  selectedAsset: string
  token?: TokenData
  onClick: () => void
}

export function AssetSelectorBadge ({
  selectedAsset,
  token,
  onClick
}: AssetSelectorBadgeProps): React.JSX.Element {
  const getAssetName = (): string => {
    if (selectedAsset === 'credits') return 'Credits'
    return token?.localizations?.en?.singularForm ?? token?.identifier ?? 'Token'
  }

  return (
    <div
      className='flex items-center gap-3 px-2 py-1 pl-1 rounded-xl bg-[rgba(76,126,255,0.15)] cursor-pointer'
      onClick={onClick}
    >
      {selectedAsset === 'credits'
        ? (
          <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white'>
            <span className='text-dash-brand text-[0.875rem] font-medium'>C</span>
          </div>
          )
        : (
          <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white'>
            <Avatar
              username={token?.identifier ?? ''}
              className='w-8 h-8'
            />
          </div>
          )}

      <Text className='text-dash-brand !text-[1.5rem] !font-medium !leading-[1.2]'>
        {getAssetName()}
      </Text>

      <ChevronIcon className='text-dash-brand !w-3' />
    </div>
  )
}
