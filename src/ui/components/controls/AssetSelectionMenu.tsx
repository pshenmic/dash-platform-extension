import React, { useState, useMemo } from 'react'
import { CreditsIcon, Input, Avatar } from 'dash-ui-kit/react'
import { OverlayMenu } from '../common'
import { AssetOptionCard } from './AssetOptionCard'
import type { TokenData } from '../../../types'
import { fromBaseUnit } from '../../../utils'

export interface AssetOption {
  value: string
  label: string
  symbol: string
  icon: React.ReactNode
  isToken?: boolean
  tokenData?: TokenData
}

const CREDITS_OPTION: AssetOption = {
  value: 'credits',
  label: 'Credits',
  symbol: 'CRDT',
  icon: (
    <div className='w-[2.438rem] h-[2.438rem] bg-[rgba(12,28,51,0.05)] rounded-full flex items-center justify-center'>
      <CreditsIcon className='!text-dash-brand w-5 h-5' />
    </div>
  )
}

// Builds the selectable asset list (Credits + the identity's tokens). Shared by
// the asset-selection menu and the transfer screen's asset step.
export function buildAssetOptions (tokens: TokenData[] = []): AssetOption[] {
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

  return [CREDITS_OPTION, ...tokenOptions]
}

// Formats an asset's balance for display. `creditsBalance` is the raw credits
// amount (string) for the Credits option.
export function formatAssetBalance (option: AssetOption, creditsBalance?: string): string {
  if (option.value === 'credits') {
    return creditsBalance != null ? `${creditsBalance} CRDT` : '0'
  }
  if ((option.isToken ?? false) && option.tokenData != null) {
    return `${fromBaseUnit(option.tokenData.balance, option.tokenData.decimals)} ${option.symbol}`
  }
  return '0'
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

  const allAssets = useMemo(() => buildAssetOptions(tokens), [tokens])

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
      showBackButton
      onBack={onClose}
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
            <AssetOptionCard
              key={asset.value}
              icon={asset.icon}
              label={asset.label}
              symbol={asset.symbol}
              balance={formatAssetBalance(asset, creditsBalance)}
              selected={asset.value === selectedAsset}
              onClick={() => handleAssetClick(asset.value)}
            />
          ))}
        </div>
      </div>
    </OverlayMenu>
  )
}
