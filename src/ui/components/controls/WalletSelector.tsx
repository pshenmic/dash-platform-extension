import React from 'react'
import { OverlayMenu, PlusIcon, WalletIcon, ValueCard } from 'dash-ui/react'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { useNavigate } from 'react-router-dom'

interface WalletSelectorProps {
  onSelect?: (walletId: string | null) => void
  currentNetwork?: string | null
  currentWalletId?: string | null
  wallets?: WalletAccountInfo[]
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelect, currentNetwork, currentWalletId, wallets = [] }) => {
  const navigate = useNavigate()
  const availableWallets = wallets.filter(wallet => wallet.network === currentNetwork)
  const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

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
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 flex items-center justify-center'>
              <WalletIcon className='w-full h-full' />
            </div>
            <span className='text-sm'>
              {wallet.label ?? `Wallet_${index + 1}`}
            </span>
          </div>
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
  )
}
