import React, { useState, useEffect } from 'react'
import { OverlayMenu, PlusIcon, WalletIcon, ValueCard, DeleteIcon, EditIcon, KebabMenuIcon } from 'dash-ui-kit/react'
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

const KEBAB_MENU_WIDTH = 121

interface ActiveKebab {
  wallet: WalletAccountInfo
  index: number
  pos: { top: number, left: number }
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelect, onRemoved, currentNetwork, currentWalletId, wallets = [] }) => {
  const navigate = useNavigate()
  const api = useExtensionAPI()
  const availableWallets = wallets.filter(wallet => wallet.network === currentNetwork)
  const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

  const [walletToRemove, setWalletToRemove] = useState<{ wallet: WalletAccountInfo, index: number } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [activeKebab, setActiveKebab] = useState<ActiveKebab | null>(null)

  useEffect(() => {
    if (activeKebab == null) return

    const close = (): void => setActiveKebab(null)

    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [activeKebab])

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
            className='ml-2 px-2 py-1 rounded-md opacity-40 hover:opacity-100 transition-opacity cursor-pointer'
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              setActiveKebab({ wallet, index, pos: { top: rect.bottom - 20, left: rect.right - (KEBAB_MENU_WIDTH / 2) - (rect.width / 2) } })
            }}
          >
            <KebabMenuIcon />
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

      {activeKebab != null && (
        <OverlayMenu
          variant='context-menu'
          position={activeKebab.pos}
          width={KEBAB_MENU_WIDTH}
          showCloseButton={true}
          closeButtonAlign='center'
          items={[
            {
              id: 'rename',
              disabled: true,
              content: (
                <div className='flex items-center gap-2 py-[2px]'>
                  <EditIcon size={16} />
                  <span className='text-sm font-medium'>Rename</span>
                </div>
              ),
              onClick: () => {}
            },
            {
              id: 'delete',
              content: (
                <div className='flex items-center gap-2'>
                  <DeleteIcon size={16} />
                  <span className='text-sm font-medium'>Delete</span>
                </div>
              ),
              className: 'cursor-pointer bg-dash-red/10 hover:!bg-dash-red/15',
              onClick: () => {
                setRemoveError(null)
                setWalletToRemove({ wallet: activeKebab.wallet, index: activeKebab.index })
              }
            }
          ]}
          showItemBorders
          size='sm'
          onClose={() => setActiveKebab(null)}
        />
      )}

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
