import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { OverlayMenu, PlusIcon, WalletIcon, ValueCard, DeleteIcon, EditIcon, KebabMenuIcon } from 'dash-ui-kit/react'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks'
import { ConfirmDialog } from './ConfirmDialog'
import { RenameWalletDialog } from './RenameWalletDialog'

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

const walletLabel = (wallet: WalletAccountInfo, index: number): string =>
  wallet.label ?? `Wallet_${index + 1}`

const IconWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='w-4 h-4 flex items-center justify-center flex-shrink-0'>{children}</div>
)

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelect, onRemoved, currentNetwork, currentWalletId, wallets = [] }) => {
  const navigate = useNavigate()
  const api = useExtensionAPI()

  const availableWallets = useMemo(
    () => wallets.filter(w => w.network === currentNetwork),
    [wallets, currentNetwork]
  )

  const currentWalletIndex = useMemo(
    () => availableWallets.findIndex(w => w.walletId === currentWalletId),
    [availableWallets, currentWalletId]
  )
  const currentWallet = currentWalletIndex >= 0 ? availableWallets[currentWalletIndex] : undefined

  const [walletToRemove, setWalletToRemove] = useState<{ wallet: WalletAccountInfo, index: number } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [activeKebab, setActiveKebab] = useState<ActiveKebab | null>(null)
  const [walletToRename, setWalletToRename] = useState<{ wallet: WalletAccountInfo, index: number } | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  useEffect(() => {
    if (activeKebab == null) return
    const close = (): void => setActiveKebab(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [activeKebab])

  const handleKebabClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, wallet: WalletAccountInfo, index: number): void => {
    e.stopPropagation()
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveKebab({ wallet, index, pos: { top: rect.bottom - 20, left: rect.right - (KEBAB_MENU_WIDTH / 2) - (rect.width / 2) } })
  }, [])

  const handleRename = async (newName: string): Promise<void> => {
    if (walletToRename == null) return

    setIsRenaming(true)
    setRenameError(null)

    try {
      await api.setWalletLabel(walletToRename.wallet.walletId, newName)
      setWalletToRename(null)
      onRemoved?.()
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename wallet')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleRemove = async (password?: string): Promise<void> => {
    if (walletToRemove == null || password == null) return

    setIsRemoving(true)
    setRemoveError(null)

    try {
      await api.removeWallet(walletToRemove.wallet.walletId, password)
      setWalletToRemove(null)
      if (currentWalletId === walletToRemove.wallet.walletId) onSelect?.(null)
      onRemoved?.()
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove wallet')
      console.log('Failed to remove wallet', err)
    } finally {
      setIsRemoving(false)
    }
  }

  if (availableWallets.length === 0) {
    return (
      <ValueCard
        size='md'
        className='flex gap-1 h-12'
        clickable='true'
        onClick={() => { void navigate('/choose-wallet-type') }}
      >
        <IconWrap><PlusIcon className='w-full h-full text-gray-900' /></IconWrap>
        <span className='text-sm font-light text-gray-900'>Add wallet</span>
      </ValueCard>
    )
  }

  if (currentWalletId == null || currentWallet == null) return null

  const triggerContent = (
    <div className='flex items-center gap-2 max-w-[120px]'>
      <WalletIcon className='!text-dash-primary-dark-blue shrink-0' size={16} />
      <span className='text-sm font-medium truncate max-w-full'>{walletLabel(currentWallet, currentWalletIndex)}</span>
    </div>
  )

  const items = [
    ...availableWallets.map((wallet, index) => ({
      id: wallet.walletId,
      content: (
        <div className='flex items-center justify-between w-full max-w-[140px] min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <IconWrap><WalletIcon className='w-full h-full shrink-0' /></IconWrap>
            <span className='text-sm truncate'>{walletLabel(wallet, index)}</span>
          </div>
          <button
            type='button'
            className='ml-2 px-2 py-1 rounded-md opacity-40 hover:opacity-100 transition-opacity cursor-pointer'
            onClick={(e) => handleKebabClick(e, wallet, index)}
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
          <IconWrap><PlusIcon color='currentColor' className='w-full h-full' /></IconWrap>
          <span className='text-sm'>Add wallet</span>
        </div>
      ),
      onClick: () => { void navigate('/choose-wallet-type') }
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
          showCloseButton
          closeButtonAlign='center'
          items={[
            {
              id: 'rename',
              content: (
                <div className='flex items-center gap-2 py-[2px]'>
                  <EditIcon size={16} />
                  <span className='text-sm font-medium'>Rename</span>
                </div>
              ),
              onClick: () => {
                setRenameError(null)
                setWalletToRename({ wallet: activeKebab.wallet, index: activeKebab.index })
              }
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

      <RenameWalletDialog
        open={walletToRename != null}
        onOpenChange={(open) => { if (!open) setWalletToRename(null) }}
        currentName={walletToRename != null ? walletLabel(walletToRename.wallet, walletToRename.index) : ''}
        onRename={handleRename}
        isLoading={isRenaming}
        error={renameError}
      />

      <ConfirmDialog
        open={walletToRemove != null}
        onOpenChange={(open) => { if (!open) setWalletToRemove(null) }}
        title='Remove Wallet'
        message={`Remove "${walletToRemove != null ? walletLabel(walletToRemove.wallet, walletToRemove.index) : ''}"? This action cannot be undone.`}
        confirmText='Remove'
        onConfirm={handleRemove}
        passwordRequired
        isLoading={isRemoving}
        error={removeError}
      />
    </>
  )
}
