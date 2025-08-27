import React, { useState, useEffect } from 'react'
import { OverlayMenu, WebIcon } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { Network } from '../../../types/enums/Network'

interface NetworkSelectorProps {
  onSelect?: (network: string) => void
  variant?: 'default' | 'card'
  [key: string]: any
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ onSelect, variant = 'default', ...props }) => {
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
      setCurrentNetwork(network)
      onSelect?.(network)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }
  useEffect(() => {
    if (typeof onSelect === 'function') onSelect(currentNetwork)
  }, [currentNetwork, onSelect])

  if (loading) {
    return (
      <div className='w-[80px] h-[32px] bg-gray-100 rounded animate-pulse' />
    )
  }

  const triggerContent = variant === 'card' 
    ? (
        <div className='flex items-center gap-1'>
          <WebIcon size={16} className='text-white' />
          <span className='text-sm font-medium text-white capitalize'>
            {currentNetwork}
          </span>
        </div>
      )
    : (
        <div className='flex items-center gap-1'>
          <WebIcon className='!text-dash-primary-dark-blue' size={16} />
          <span className='text-sm font-medium capitalize'>
            {currentNetwork}
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
