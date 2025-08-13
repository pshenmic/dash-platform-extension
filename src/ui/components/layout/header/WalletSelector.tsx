import React, { useState, useEffect } from 'react'
import { Identifier, OverlayMenu } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'

interface MockWallet {
  walletId: string
  label: string | null
  network: string
}

const MOCK_WALLETS: MockWallet[] = [
  {
    walletId: 'wallet_1',
    label: 'Main Wallet',
    network: 'testnet'
  },
  {
    walletId: 'wallet_2',
    label: 'Dev Wallet',
    network: 'testnet'
  },
  {
    walletId: 'wallet_3',
    label: null,
    network: 'mainnet'
  }
]

export const WalletSelector: React.FC = () => {
  const extensionAPI = useExtensionAPI()
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<string>('testnet')
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loadCurrentWallet = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()

        console.log('status', status)
        setCurrentWalletId(status.currentWalletId)
        setCurrentNetwork(status.network)
      } catch (error) {
        console.error('Failed to load current wallet:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadCurrentWallet()
  }, [extensionAPI])

  const handleWalletChange = async (walletId: string): Promise<void> => {
    try {
      await extensionAPI.switchWallet(walletId, currentNetwork)
      setCurrentWalletId(walletId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch wallet:', error)
    }
  }

  const handleMenuClick = (event: React.MouseEvent, walletId: string): void => {
    event.stopPropagation()
    console.log('Menu clicked for wallet:', walletId)
  }

  const handleCloseMenu = (): void => {
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className='w-[120px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  const availableWallets = MOCK_WALLETS.filter(wallet => wallet.network === currentNetwork)
  const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

  console.log('availableWallets', availableWallets)

  console.log('{currentWalletId, availableWalletsLength: availableWallets.length, currentWallet}',
    {currentWalletId, availableWalletsLength: availableWallets.length, currentWallet})

  if (currentWalletId == null || availableWallets.length === 0 || !currentWallet) {
    return null
  }

  const trigger = (
    <div className='flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'>
      <Identifier
        middleEllipsis
        edgeChars={4}
        avatar
        size='sm'
      >
        {currentWallet.walletId}
      </Identifier>
      <span className='text-xs'>
        {currentWallet.label ?? `Wallet ${currentWallet.walletId.slice(-4)}`}
      </span>
      <svg className='w-4 h-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
      </svg>
    </div>
  )

  const content = (
    <div className='w-[185px] bg-white rounded-[15px] shadow-lg border border-gray-100 overflow-hidden'>
      {/* Header */}
      <div className='px-4 py-3 border-b border-gray-50'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-gray-900'>Your wallet</span>
          <button 
            onClick={handleCloseMenu}
            className='w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700'
          >
            <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='w-full h-full'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      </div>

      {/* Wallet List */}
      {availableWallets.map((wallet, index) => (
        <div 
          key={wallet.walletId}
          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
            index < availableWallets.length - 1 ? 'border-b border-gray-50' : ''
          }`}
          onClick={() => handleWalletChange(wallet.walletId)}
        >
          <div className='flex items-center gap-1'>
            {/* Wallet icon */}
            <div className='w-4 h-4 flex items-center justify-center'>
              <svg fill='currentColor' viewBox='0 0 24 24' className='w-full h-full text-gray-900'>
                <path d='M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/>
              </svg>
            </div>
            <span className='text-sm font-light text-gray-900'>
              {wallet.label ?? `Wallet_${wallet.walletId.slice(-1)}`}
            </span>
          </div>
          
          {/* Three dots menu */}
          <button
            onClick={(e) => handleMenuClick(e, wallet.walletId)}
            className='w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded'
          >
            <div className='flex flex-col gap-0.5'>
              <div className='w-0.5 h-0.5 bg-gray-900 rounded-full'></div>
              <div className='w-0.5 h-0.5 bg-gray-900 rounded-full'></div>
              <div className='w-0.5 h-0.5 bg-gray-900 rounded-full'></div>
            </div>
          </button>
        </div>
      ))}

      {/* Add Wallet */}
      <div className='px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-1'>
        <div className='w-4 h-4 flex items-center justify-center'>
          <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='w-full h-full text-gray-900'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
        </div>
        <span className='text-sm font-light text-gray-900'>Add wallet</span>
      </div>
    </div>
  )

  return (
    <OverlayMenu
      isOpen={isOpen}
      onToggle={setIsOpen}
      trigger={trigger}
      content={content}
      placement='bottom-start'
    />
  )
}
