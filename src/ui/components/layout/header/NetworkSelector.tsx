import React, { useState, useEffect } from 'react'
import { OverlayMenu, WebIcon } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { Network } from '../../../../types/enums/Network'

interface NetworkSelectorProps {
  onSelect?: (network: string) => void
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ onSelect }) => {
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
        onSelect?.(network)
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

  const triggerContent = (
    <div className="flex items-center gap-1">
      <WebIcon size={16} />
      <span className="text-sm font-medium">
        {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
      </span>
    </div>
  )

  const items = Object.values(Network).map(network => ({
    id: network,
    content: (
      <div className="flex items-center gap-1">
        <span>{network.charAt(0).toUpperCase() + network.slice(1)}</span>
      </div>
    ),
    onClick: () => handleNetworkChange(network)
  }))

  return (
    <OverlayMenu
      triggerContent={triggerContent}
      items={items}
      size='md'
      border={true}
      showArrow={true}
      className='min-w-32 h-12'
    />
  )
}
