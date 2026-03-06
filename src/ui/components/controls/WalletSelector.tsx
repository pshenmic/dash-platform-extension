import React, { useState } from 'react'
import { OverlayMenu, PlusIcon, WalletIcon, ValueCard, DeleteIcon } from 'dash-ui-kit/react'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { ConfirmDialog } from './ConfirmDialog'

interface WalletSelectorProps {
  onSelect?: (walletId: string | null) => void
  onRemoved?: () => void
  currentNetwork?: string | null
  currentWalletId?: string | null
  wallets?: WalletAccountInfo[]
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelect, onRemoved, currentNetwork, currentWalletId, wallets = [] }) => {
  const navigate = useNavigate()
  const api = useExtensionAPI()
  const availableWallets = wallets.filter(wallet => wallet.network === currentNetwork)
  const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

  const [walletToRemove, setWalletToRemove] = useState<{ wallet: WalletAccountInfo, index: number } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const handleRemove = async (password?: string): Promise<void> => {
    if (walletToRemove == null || password == null) return

    setIsRemoving(true)
    setRemoveError(null)

    try {
      await api.removeWallet(walletToRemove.wallet.walletId, password)
      setWalletToRemove(null)
      if (currentWalletId === walletToRemove.wallet.walletId) {
        onSelect?.(null)
      }
      onRemoved?.()
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove wallet')
      throw err
    } finally {
      setIsRemoving(false)
    }
  }

  if (currentWalletId == null || availableWallets.length === 0 || (currentWallet == null)) {
    if (availableWallets.length === 0) {
      return (
        <ValueCard
          size='md'
          className='flex gap-1 h-12'
          clickable='true'
          onClick={() => {
            void navigate('/choose-wallet-type')
          }}
        >
          <div className='w-4 h-4 flex items-center justify-center'>
            <PlusIcon className='w-full h-full text-gray-900' />
          </div>
          <span className='text-sm font-light text-gray-900'>Add wallet</span>
        </ValueCard>
      )
    }

    return null
  }

  const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWalletId)

  const triggerContent = (
    <div className='flex items-center gap-2'>
      <WalletIcon className='!text-dash-primary-dark-blue' size={16} />
      <span className='text-sm font-medium'>
        {currentWallet.label ?? `Wallet_${currentWalletIndex + 1}`}
      </span>
    </div>
  )

  const items = [
    ...availableWallets.map((wallet, index) => ({
      id: wallet.walletId,
      content: (
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 flex items-center justify-center'>
              <WalletIcon className='w-full h-full' />
            </div>
            <span className='text-sm'>
              {wallet.label ?? `Wallet_${index + 1}`}
            </span>
          </div>
          <button
            type='button'
            className='ml-2 opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity'
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setRemoveError(null)
              setWalletToRemove({ wallet, index })
            }}
          >
            <DeleteIcon className='w-4 h-4' />
          </button>
        </div>
      ),
      onClick: async () => onSelect?.(wallet.walletId)
    })),
    {
      id: 'add-wallet',
      content: (
        <div className='flex items-center justify-center gap-2'>
          <div className='w-4 h-4 flex items-center justify-center'>
            <PlusIcon color='currentColor' className='w-full h-full' />
          </div>
          <span className='text-sm'>Add wallet</span>
        </div>
      ),
      onClick: () => {
        void navigate('/choose-wallet-type')
      }
    }
  ]

  return (
    <>
      <OverlayMenu
        overlayLabel='Your wallet'
        triggerContent={triggerContent}
        items={items}
        size='md'
        border
        showArrow
        showItemBorders
        className='!w-44 h-12'
      />

      <ConfirmDialog
        open={walletToRemove != null}
        onOpenChange={(open) => {
          if (!open) setWalletToRemove(null)
        }}
        title='Remove Wallet'
        message={`Remove "${walletToRemove?.wallet.label ?? `Wallet_${(walletToRemove?.index ?? 0) + 1}`}"? This action cannot be undone.`}
        confirmText='Remove'
        onConfirm={handleRemove}
        passwordRequired
        isLoading={isRemoving}
        error={removeError}
      />
    </>
  )
}
