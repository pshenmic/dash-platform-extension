import React, { useState, useEffect } from 'react'
import { OverlayMenu, KebabMenuIcon, PlusIcon, WalletIcon } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { WalletAccountInfo } from '../../../../types/messages/response/GetAllWalletsResponse'
import { useNavigate } from 'react-router-dom'

interface WalletSelectorProps {
  onSelect?: (walletId: string) => void
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onSelect }) => {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<string>('testnet')
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWalletData = async (): Promise<void> => {
      try {
        const [status, wallets] = await Promise.all([
          extensionAPI.getStatus(),
          extensionAPI.getAllWallets()
        ])

        setCurrentWalletId(status.currentWalletId)
        setCurrentNetwork(status.network)
        setAllWallets(wallets)
      } catch (error) {
        console.warn('Failed to load wallet data:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadWalletData()
  }, [extensionAPI])

  const handleWalletChange = async (walletId: string): Promise<void> => {
    try {
      await extensionAPI.switchWallet(walletId, currentNetwork)
      setCurrentWalletId(walletId)
      onSelect?.(walletId)
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch wallet:', error)
    }
  }

  const handleMenuClick = (event: React.MouseEvent, walletId: string): void => {
    event.stopPropagation()
    console.log('Menu clicked for wallet:', walletId)
  }

  if (loading) {
    return (
      <div className='w-[120px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)
  const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

  console.log('WalletSelector debug:', {
    currentWalletId,
    currentNetwork,
    allWalletsCount: allWallets.length,
    availableWalletsCount: availableWallets.length,
    currentWallet,
    allWallets,
    availableWallets
  })

  if (currentWalletId == null || availableWallets.length === 0 || !currentWallet) {
    console.log('WalletSelector returning null because:', {
      currentWalletIdIsNull: currentWalletId == null,
      noAvailableWallets: availableWallets.length === 0,
      noCurrentWallet: !currentWallet
    })

    // Show "Add wallet" button if no wallets available
    if (availableWallets.length === 0) {
      return (
        <div className='flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'>
          <div className='w-4 h-4 flex items-center justify-center'>
            <PlusIcon className='w-full h-full text-gray-900' />
          </div>
          <span className='text-sm font-light text-gray-900'>Add wallet</span>
        </div>
      )
    }
    
    return null
  }

  const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWalletId)
  
  const triggerContent = (
    <div className='flex items-center gap-2'>
      <span className='text-xs'>
        {currentWallet.label ?? `Wallet_${currentWalletIndex + 1}`}
      </span>
    </div>
  )

  const items = [
    // Wallet items
    ...availableWallets.map((wallet, index) => ({
      id: wallet.walletId,
      content: (
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {/* Wallet icon */}
            <div className='w-4 h-4 flex items-center justify-center'>
              <WalletIcon className='w-full h-full' />
            </div>
            <span className='text-sm'>
              {wallet.label ?? `Wallet_${index + 1}`}
            </span>
          </div>

          {/* Three dots menu */}
          <button
            onClick={(e) => handleMenuClick(e, wallet.walletId)}
            className='w-6 -mr-1 h-6 flex items-center justify-center hover:bg-gray-100 rounded'
          >
            <KebabMenuIcon />
          </button>
        </div>
      ),
      onClick: () => handleWalletChange(wallet.walletId)
    })),
    // Add wallet item
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
        void navigate('/create-wallet')
      }
    }
  ]

  return (
    <OverlayMenu
      overlayLabel='Your wallet'
      triggerContent={triggerContent}
      items={items}
      size='md'
      border={true}
      showArrow={true}
      showItemBorders={true}
      className='!w-44 h-12'
    />
  )
}
