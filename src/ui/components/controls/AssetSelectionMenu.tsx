import React, { useState, useMemo } from 'react'
import { Text, CreditsIcon, Input, Avatar } from 'dash-ui-kit/react'
import { OverlayMenu } from '../common'
import type { TokenData } from '../../../types'
import { fromBaseUnit } from '../../../utils'

interface AssetOption {
  value: string
  label: string
  symbol: string
  icon: React.ReactNode
  balance?: string
  isToken?: boolean
  tokenData?: TokenData
}

interface AssetSelectionMenuProps {
  isOpen: boolean
  onClose: () => void
  selectedAsset: string
  onAssetSelect: (asset: string) => void
  dashBalance?: string
  creditsBalance?: string
  tokens?: TokenData[]
}

const ASSET_OPTIONS: AssetOption[] = [
  {
    value: 'credits',
    label: 'Credits',
    symbol: 'CRDT',
    icon: (
      <div className='w-[2.438rem] h-[2.438rem] bg-[rgba(12,28,51,0.05)] rounded-full flex items-center justify-center'>
        <CreditsIcon className='!text-dash-brand w-5 h-5' />
      </div>
    )
  }
]

export const AssetSelectionMenu: React.FC<AssetSelectionMenuProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  onAssetSelect,
  creditsBalance,
  tokens = []
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleAssetClick = (asset: string): void => {
    onAssetSelect(asset)
    onClose()
  }

  const getAssetBalance = (asset: AssetOption): string => {
    if (asset.value === 'credits' && (creditsBalance !== null && creditsBalance !== undefined)) {
      return `${creditsBalance} CRDT`
    }
    if ((asset.isToken ?? false) && (asset.tokenData != null)) {
      const balance = fromBaseUnit(asset.tokenData.balance, asset.tokenData.decimals)
      return `${balance} ${asset.symbol}`
    }
    return '0'
  }

  const allAssets = useMemo(() => {
    const tokenOptions: AssetOption[] = tokens.map(token => {
      const singularForm = (token.localizations?.en?.singularForm ?? null) !== null ? token.localizations.en.singularForm : token.identifier
      return {
        value: token.identifier,
        label: singularForm,
        symbol: singularForm.toUpperCase().slice(0, 4),
        icon: (
          <Avatar
            username={token.identifier}
            className='w-[2.438rem] h-[2.438rem]'
          />
        ),
        isToken: true,
        tokenData: token
      }
    })

    return [...ASSET_OPTIONS, ...tokenOptions]
  }, [tokens])

  const filteredAssets = useMemo(() => {
    if (searchQuery.trim() === '') return allAssets

    const query = searchQuery.toLowerCase()
    return allAssets.filter(asset =>
      asset.label.toLowerCase().includes(query) ||
      asset.symbol.toLowerCase().includes(query)
    )
  }, [searchQuery, allAssets])

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
          {filteredAssets.map((asset) => {
            const isSelected = asset.value === selectedAsset
            return (
              <div
                key={asset.value}
                onClick={() => handleAssetClick(asset.value)}
                className={`rounded-[15px] px-[15px] py-2.5 cursor-pointer transition-all border-l-2 ${
                  isSelected
                    ? 'bg-dash-brand/15 border-dash-brand'
                    : 'bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08] border-transparent'
                }`}
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

                  <div className='flex items-center gap-2'>
                    <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
                      {getAssetBalance(asset)}
                    </Text>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </OverlayMenu>
  )
}
