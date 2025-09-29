import React, { useState, useMemo } from 'react'
import { Text, DashLogo, Input } from 'dash-ui-kit/react'
import { OverlayMenu } from '../common'

interface AssetOption {
  value: 'dash' | 'credits'
  label: string
  symbol: string
  icon: React.ReactNode
  balance?: string
}

interface AssetSelectionMenuProps {
  isOpen: boolean
  onClose: () => void
  selectedAsset: 'dash' | 'credits'
  onAssetSelect: (asset: 'dash' | 'credits') => void
  dashBalance?: string
  creditsBalance?: string
}

const ASSET_OPTIONS: AssetOption[] = [
  {
    value: 'dash',
    label: 'Dash',
    symbol: 'DASH',
    icon: (
      <div className='w-[39px] h-[39px] bg-dash-brand rounded-full flex items-center justify-center'>
        <DashLogo className='!text-white w-5 h-4' />
      </div>
    )
  },
  {
    value: 'credits',
    label: 'Credits',
    symbol: 'CRDT',
    icon: (
      <div className='w-[39px] h-[39px] bg-[rgba(12,28,51,0.05)] rounded-full flex items-center justify-center'>
        <Text size='md' weight='medium' className='text-dash-brand !text-[15px] leading-[21px]'>
          C
        </Text>
      </div>
    )
  }
]

export const AssetSelectionMenu: React.FC<AssetSelectionMenuProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  onAssetSelect,
  dashBalance,
  creditsBalance
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleAssetClick = (asset: 'dash' | 'credits') => {
    onAssetSelect(asset)
    onClose()
  }

  const getAssetBalance = (assetValue: 'dash' | 'credits'): string => {
    if (assetValue === 'dash' && dashBalance) {
      return `${dashBalance} DASH`
    }
    if (assetValue === 'credits' && creditsBalance) {
      return `${creditsBalance} CRDT`
    }
    return '0'
  }

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return ASSET_OPTIONS
    
    const query = searchQuery.toLowerCase()
    return ASSET_OPTIONS.filter(asset => 
      asset.label.toLowerCase().includes(query) ||
      asset.symbol.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={onClose}
      title='Select an asset'
    >
      <div className='flex flex-col gap-4'>
        {/* Search Input */}
          <Input
            placeholder='Search'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size='xl'
            colorScheme='default'
            className='w-full'
          />

        {/* Assets List */}
        <div className='flex flex-col gap-2.5'>
          {filteredAssets.map((asset) => (
          <div
            key={asset.value}
            onClick={() => handleAssetClick(asset.value)}
            className='bg-[rgba(12,28,51,0.03)] rounded-[15px] px-[15px] py-2.5 cursor-pointer hover:bg-[rgba(12,28,51,0.06)] transition-colors'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {asset.icon}
                
                <div className='flex items-center gap-2'>
                  <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
                    {asset.label}
                  </Text>
                  
                  <div className='bg-[rgba(76,126,255,0.1)] rounded px-[5px] py-[3px]'>
                    <Text size='xs' weight='medium' className='text-dash-brand !text-[10px] leading-[1.366]'>
                      {asset.symbol}
                    </Text>
                  </div>
                </div>
              </div>
              
              <div className='text-right'>
                <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
                  {getAssetBalance(asset.value)}
                </Text>
              </div>
            </div>
          </div>
          ))}
        </div>
      </div>
    </OverlayMenu>
  )
}
