import React, { useState, useEffect } from 'react'
import { Select, Identifier } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'

interface MockWallet {
  walletId: string
  label: string | null
  network: string
}

// Мокированные данные кошельков для тестирования
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

  useEffect(() => {
    const loadCurrentWallet = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
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
    } catch (error) {
      console.error('Failed to switch wallet:', error)
    }
  }

  if (loading) {
    return (
      <div className='w-[120px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  // Фильтруем кошельки по текущей сети
  const availableWallets = MOCK_WALLETS.filter(wallet => wallet.network === currentNetwork)

  const walletOptions = availableWallets.map(wallet => ({
    value: wallet.walletId,
    content: (
      <div className='flex items-center gap-2'>
        <Identifier
          middleEllipsis
          edgeChars={4}
          avatar
          size='sm'
        >
          {wallet.walletId}
        </Identifier>
        <span className='text-xs'>
          {wallet.label ?? `Wallet ${wallet.walletId.slice(-4)}`}
        </span>
      </div>
    )
  }))

  if (currentWalletId == null || availableWallets.length === 0) {
    return null
  }

  return (
    <Select
      value={currentWalletId}
      onChange={handleWalletChange}
      options={walletOptions}
      size='sm'
      showArrow
      border
    />
  )
}
