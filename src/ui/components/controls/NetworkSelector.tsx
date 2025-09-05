import React, { useState, useEffect } from 'react'
import { OverlayMenu, WebIcon } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { Network } from '../../../types/enums/Network'

interface NetworkSelectorProps {
  onSelect?: (network: string) => void
  variant?: 'default' | 'card'
  className?: string
  currentNetwork?: 'mainnet' | 'testnet'
  border?: boolean
  wallets?: any[]
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ onSelect, variant = 'default', currentNetwork, ...props }) => {
  const extensionAPI = useExtensionAPI()
  const [localCurrentNetwork, setLocalCurrentNetwork] = useState<string>(currentNetwork ?? 'mainnet')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLocalCurrentNetwork = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setLocalCurrentNetwork(status.network)
      } catch (error) {
        console.error('Failed to load current network:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadLocalCurrentNetwork()
  }, [extensionAPI])

  const handleNetworkChange = async (network: string): Promise<void> => {
    try {
      setLocalCurrentNetwork(network)
      onSelect?.(network)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }
  useEffect(() => {
    if (typeof onSelect === 'function') onSelect(localCurrentNetwork)
  }, [localCurrentNetwork, onSelect])

  if (loading) {
    return (
      <div className='w-[80px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  const triggerContent = (
    <div className='flex items-center gap-1'>
      <WebIcon
        size={16}
        className={variant === 'card' ? 'text-white' : '!text-dash-primary-dark-blue'}
      />
      <span className={`text-sm font-medium capitalize ${variant === 'card' ? 'text-white' : ''}`}>
        {localCurrentNetwork}
      </span>
    </div>
  )

  const items = Object.values(Network).map(network => ({
    id: network,
    content: (
      <div className='flex items-center gap-1 capitalize'>
        <span>{network}</span>
      </div>
    ),
    onClick: async () => await handleNetworkChange(network)
  }))

  const baseClassName = variant === 'card'
    ? 'min-w-32 h-12 !bg-transparent !border-none'
    : 'min-w-32 h-12'

  return (
    <OverlayMenu
      triggerContent={triggerContent}
      items={items}
      size='md'
      border={variant !== 'card'}
      showArrow
      className={`${baseClassName} ${props.className ?? ''}`}
      {...props}
    />
  )
}
