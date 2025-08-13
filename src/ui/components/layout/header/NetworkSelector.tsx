import React, { useState, useEffect } from 'react'
import { Select } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { Network } from '../../../../types/enums/Network'

export const NetworkSelector: React.FC = () => {
  const extensionAPI = useExtensionAPI()
  const [currentNetwork, setCurrentNetwork] = useState<string>('testnet')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentNetwork = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setCurrentNetwork(status.network)
      } catch (error) {
        console.error('Failed to load current network:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadCurrentNetwork()
  }, [extensionAPI])

  const handleNetworkChange = async (network: string): Promise<void> => {
    try {
      // Мок для переключения сети - в будущем будет реальный API вызов
      const status = await extensionAPI.getStatus()
      if (status.currentWalletId != null) {
        await extensionAPI.switchWallet(status.currentWalletId, network)
        setCurrentNetwork(network)
      }
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  if (loading) {
    return (
      <div className='w-[80px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  const networkOptions = Object.values(Network).map(network => ({
    value: network,
    content: network.charAt(0).toUpperCase() + network.slice(1)
  }))

  return (
    <Select
      value={currentNetwork}
      onChange={handleNetworkChange}
      options={networkOptions}
      size='md'
      showArrow
      border
    />
  )
}
