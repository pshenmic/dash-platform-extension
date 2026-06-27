import React, { useEffect, useRef, useState } from 'react'
import { OverlayMenu } from '../common'
import { Text, Button, ValueCard, Tabs } from 'dash-ui-kit/react'
import { PasswordField } from '../forms'
import { AddressItem, type AddressData } from './AddressItem'
import { ShieldedAddresses } from './ShieldedAddresses'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import type { NetworkType } from '../../../types'

interface AddressesMenuProps {
  isOpen: boolean
  onClose: () => void
  currentWallet?: string | null
  currentNetwork?: NetworkType | null
}

type DerivedAddresses = Awaited<ReturnType<ReturnType<typeof useExtensionAPI>['getPlatformAddresses']>>

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
  const [needsPassword, setNeedsPassword] = useState(false)
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('transparent')
  const loadingRef = useRef(false)

  useEffect(() => {
    setAddresses([])
    setHasLoaded(false)
    setNeedsPassword(false)
    setError(null)
  }, [currentWallet, currentNetwork])

  // Fetch balances and tx counts for the derived addresses
  const populate = async (derived: DerivedAddresses): Promise<void> => {
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
  }

  // Load addresses without a password, from the cached account xpub.
  // If the xpub has not been cached yet, fall back to a one-time password request.
  const loadAddresses = async (): Promise<void> => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const initialized = await extensionAPI.isPlatformAccountInitialized()
      if (!initialized) {
        setNeedsPassword(true)
        return
      }

      setNeedsPassword(false)
      const derived = await extensionAPI.getPlatformAddresses()
      await populate(derived)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }

  const initialize = async (): Promise<void> => {
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
        return
      }

      await extensionAPI.cachePlatformAccountXpub(password)
      setPassword('')
      setNeedsPassword(false)

      const derived = await extensionAPI.getPlatformAddresses()
      await populate(derived)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !hasLoaded && !needsPassword) void loadAddresses()
  }, [isOpen, hasLoaded])

  const handleClose = (): void => {
    setPassword('')
    setPasswordError(null)
    onClose()
  }

  const transparentContent = (
    <div className='flex flex-col gap-4 pt-4'>
      <Text size='sm' dim>
        Your Platform Addresses. It is recommended to use different addresses for each transaction.
      </Text>

      {needsPassword && (
        <div className='flex flex-col gap-4'>
          <Text size='sm' dim>
            Enter your password once to enable platform addresses for this wallet.
          </Text>
          <PasswordField
            value={password}
            onChange={(value) => { setPassword(value); setPasswordError(null) }}
            error={passwordError}
            autoFocus
          />
          <Button
            colorScheme='brand'
            onClick={() => { void initialize() }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Enable Addresses'}
          </Button>
        </div>
      )}

      {isLoading && !needsPassword && (
        <Text size='sm' dim>Loading addresses...</Text>
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
  )

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={handleClose}
      title='Address List'
      showBackButton
      onBack={handleClose}
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: 'transparent',
            label: 'Transparent',
            content: transparentContent
          },
          {
            value: 'shielded',
            label: 'Shielded',
            content: <ShieldedAddresses />
          }
        ]}
      />
    </OverlayMenu>
  )
}
