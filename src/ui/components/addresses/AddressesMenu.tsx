import React, { useEffect, useState } from 'react'
import { OverlayMenu } from '../common'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { AddressItem, type AddressData } from './AddressItem'
import { useSdk } from '../../hooks/useSdk'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import type { NetworkType } from '../../../types'
import { NetworkWASM, PlatformAddressWASM } from 'pshenmic-dpp'

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

    const networkEnum = currentNetwork === 'mainnet' ? NetworkWASM.Mainnet : NetworkWASM.Testnet

    // Builds a P2PKH PlatformAddress from a public key hash. The serialized
    // form is [variant byte][20-byte hash], where variant 0 = P2PKH.
    const platformAddressFromHash = (hexHash: string): PlatformAddressWASM => {
      const hash = new Uint8Array(hexHash.length / 2)
      for (let i = 0; i < hexHash.length; i += 2) {
        hash[i / 2] = parseInt(hexHash.substring(i, i + 2), 16)
      }
      const bytes = new Uint8Array(hash.length + 1)
      bytes[0] = 0
      bytes.set(hash, 1)
      return PlatformAddressWASM.fromBytes(bytes)
    }

    const loadAddresses = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const publicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)

        const entries = publicKeys
          .map((key: any) => {
            const keyId = key?.keyId ?? key?.getId?.() ?? 0
            try {
              const hexHash: string = key?.getPublicKeyHash?.() ?? ''
              if (hexHash === '') return null
              const platformAddress = platformAddressFromHash(hexHash)
              const data: AddressData = {
                keyId,
                address: platformAddress.toBech32m(networkEnum),
                balance: null,
                totalTxs: null,
                loading: true
              }
              return { data, platformAddress }
            } catch {
              return null
            }
          })
          .filter((entry): entry is { data: AddressData, platformAddress: PlatformAddressWASM } => entry !== null)

        setAddresses(entries.map((entry) => entry.data))
        setIsLoading(false)

        const network = currentNetwork ?? 'testnet'

        const enriched = await Promise.all(
          entries.map(async ({ data, platformAddress }) => {
            const [balanceResult, txsResult] = await Promise.allSettled([
              sdk.platformAddresses.getAddressInfo(platformAddress),
              platformExplorerClient.fetchAddress(data.address, network)
            ])

            return {
              ...data,
              balance: balanceResult.status === 'fulfilled'
                ? balanceResult.value.balance.toString()
                : null,
              totalTxs: txsResult.status === 'fulfilled'
                ? txsResult.value.totalTxs ?? 0
                : null,
              loading: false
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
