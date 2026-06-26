import React, { useEffect, useState } from 'react'
import { OverlayMenu } from '../common'
import { Text, Button, ValueCard } from 'dash-ui-kit/react'
import { PasswordField } from '../forms'
import { AddressItem, type AddressData } from './AddressItem'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import type { NetworkType } from '../../../types'

interface AddressesMenuProps {
  isOpen: boolean
  onClose: () => void
  currentWallet?: string | null
  currentNetwork?: NetworkType | null
}

export const AddressesMenu: React.FC<AddressesMenuProps> = ({
  isOpen,
  onClose,
  currentWallet,
  currentNetwork
}) => {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAddresses([])
    setHasLoaded(false)
    setError(null)
  }, [currentWallet, currentNetwork])

  const loadAddresses = async (): Promise<void> => {
    if (password === '') {
      setPasswordError('Password must be provided')
      return
    }

    setIsLoading(true)
    setPasswordError(null)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        setIsLoading(false)
        return
      }

      const derived = await extensionAPI.getPlatformAddresses(password)
      setPassword('')

      const initial: AddressData[] = derived.map((entry) => ({
        index: entry.index,
        derivationPath: entry.derivationPath,
        address: entry.address,
        balance: null,
        totalTxs: null,
        loading: true
      }))

      setAddresses(initial)
      setHasLoaded(true)
      setIsLoading(false)

      const network = currentNetwork ?? 'testnet'

      const [infos, txCounts] = await Promise.all([
        extensionAPI.getPlatformAddressesInfos(initial.map((item) => item.address)),
        Promise.all(initial.map(async (item) => {
          try {
            const data = await platformExplorerClient.fetchAddress(item.address, network)
            return data.totalTxs ?? 0
          } catch {
            return null
          }
        }))
      ])

      const balanceByAddress = new Map(infos.map((info) => [info.address, info.balance]))

      setAddresses(initial.map((item, i) => ({
        ...item,
        balance: balanceByAddress.get(item.address) ?? null,
        totalTxs: txCounts[i],
        loading: false
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
      setIsLoading(false)
    }
  }

  const handleClose = (): void => {
    // Clear only the password-entry state; keep the cached addresses so
    // reopening the menu does not require the password again.
    setPassword('')
    setPasswordError(null)
    onClose()
  }

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={handleClose}
      title='Address List'
      showBackButton
      onBack={handleClose}
    >
      <div className='flex flex-col gap-4'>
        <Text size='sm' dim>
          Your Platform Addresses. It is recommended to use different addresses for each transaction.
        </Text>

        {!hasLoaded && (
          <div className='flex flex-col gap-4'>
            <PasswordField
              value={password}
              onChange={(value) => { setPassword(value); setPasswordError(null) }}
              error={passwordError}
              autoFocus
            />
            <Button
              colorScheme='brand'
              onClick={() => { void loadAddresses() }}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Show Addresses'}
            </Button>
          </div>
        )}

        {error != null && (
          <ValueCard colorScheme='red' size='xl'>
            <Text size='sm' color='red'>{error}</Text>
          </ValueCard>
        )}

        {hasLoaded && error == null && addresses.length === 0 && (
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='sm' dim>No addresses available</Text>
          </ValueCard>
        )}

        {addresses.length > 0 && (
          <div className='flex flex-col gap-2'>
            {addresses.map((item) => (
              <AddressItem
                key={`${item.index}-${item.address}`}
                item={item}
                explorerUrl={platformExplorerClient.getAddressExplorerUrl(
                  item.address,
                  currentNetwork ?? 'testnet'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </OverlayMenu>
  )
}
