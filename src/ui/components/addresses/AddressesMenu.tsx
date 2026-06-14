import React, { useEffect, useState } from 'react'
import { OverlayMenu } from '../common'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { AddressItem, type AddressData } from './AddressItem'
import { useSdk } from '../../hooks/useSdk'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import type { NetworkType } from '../../../types'

interface AddressesMenuProps {
  isOpen: boolean
  onClose: () => void
  currentIdentity?: string | null
  currentNetwork?: NetworkType | null
}

export const AddressesMenu: React.FC<AddressesMenuProps> = ({
  isOpen,
  onClose,
  currentIdentity,
  currentNetwork
}) => {
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || currentIdentity == null) return

    const loadAddresses = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const publicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)

        const initialAddresses: AddressData[] = publicKeys
          .map((key: any) => {
            const keyId = key?.keyId ?? key?.getId?.() ?? 0
            let address = ''
            try {
              address = key?.getPublicKeyHash?.() ?? ''
            } catch {}

            return {
              keyId,
              address,
              balance: null,
              totalTxs: null,
              loading: true
            }
          })
          .filter((item: AddressData) => item.address !== '')

        setAddresses(initialAddresses)
        setIsLoading(false)

        const network = (currentNetwork ?? 'testnet') as NetworkType

        const enriched = await Promise.all(
          initialAddresses.map(async (item) => {
            try {
              const data = await platformExplorerClient.fetchAddress(item.address, network)
              return {
                ...item,
                balance: data.balance ?? null,
                totalTxs: data.totalTxs ?? 0,
                loading: false
              }
            } catch {
              return { ...item, loading: false }
            }
          })
        )

        setAddresses(enriched)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load addresses')
        setIsLoading(false)
      }
    }

    void loadAddresses()
  }, [isOpen, currentIdentity, currentNetwork, sdk, platformExplorerClient])

  const handleClose = (): void => {
    setAddresses([])
    setError(null)
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

        {isLoading && (
          <Text size='sm' dim>Loading addresses...</Text>
        )}

        {error != null && (
          <ValueCard colorScheme='red' size='xl'>
            <Text size='sm' color='red'>{error}</Text>
          </ValueCard>
        )}

        {currentIdentity == null && !isLoading && (
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='sm' dim>No identity selected</Text>
          </ValueCard>
        )}

        {!isLoading && error == null && addresses.length === 0 && currentIdentity != null && (
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='sm' dim>No addresses available</Text>
          </ValueCard>
        )}

        {addresses.length > 0 && (
          <div className='flex flex-col gap-2'>
            {addresses.map((item) => (
              <AddressItem
                key={`${item.keyId}-${item.address}`}
                item={item}
                explorerUrl={platformExplorerClient.getAddressExplorerUrl(
                  item.address,
                  (currentNetwork ?? 'testnet') as NetworkType
                )}
              />
            ))}
          </div>
        )}
      </div>
    </OverlayMenu>
  )
}
