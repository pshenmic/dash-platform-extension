import React, { useEffect, useRef, useState } from 'react'
import { Text, Button, ValueCard, Tabs } from 'dash-ui-kit/react'
import { PasswordField } from '../forms'
import { AddressItem, type AddressData } from './AddressItem'
import { ShieldedAddresses } from './ShieldedAddresses'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import type { NetworkType } from '../../../types'

interface AddressesPanelProps {
  currentNetwork?: NetworkType | null
}

export const AddressesPanel: React.FC<AddressesPanelProps> = ({ currentNetwork }) => {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('transparent')
  const loadingRef = useRef(false)

  // Fetch the created addresses (public, no password) and enrich with balances
  // and transaction counts.
  const refreshList = async (): Promise<void> => {
    const created = await extensionAPI.listPlatformAddresses()

    const initial: AddressData[] = created.map((entry) => ({
      index: entry.index,
      derivationPath: entry.derivationPath,
      address: entry.address,
      balance: null,
      totalTxs: null,
      loading: true
    }))

    setAddresses(initial)

    if (initial.length === 0) return

    const network = currentNetwork ?? 'testnet'

    // Balance + nonce come from the batched SDK-backed handler. The transaction
    // count has no SDK equivalent, so it still comes from the explorer.
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

  // Load the existing list on mount. No password required.
  const loadList = async (): Promise<void> => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      await refreshList()
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    void loadList()
  }, [])

  // Generate the next address without a password. New wallets have the xpub
  // cached at creation, so this just works. If the xpub is missing (legacy
  // wallet), generation fails and we fall back to a one-time password prompt.
  const handleCreate = async (): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    try {
      await extensionAPI.generatePlatformAddresses()
      setNeedsPassword(false)
      await refreshList()
    } catch {
      setNeedsPassword(true)
    } finally {
      setIsGenerating(false)
    }
  }

  // Legacy wallets: initialize the xpub with the password and generate the
  // first address. Subsequent generations no longer need the password.
  const handleCreateWithPassword = async (): Promise<void> => {
    if (password === '') {
      setPasswordError('Password must be provided')
      return
    }

    setIsGenerating(true)
    setPasswordError(null)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        return
      }

      await extensionAPI.generatePlatformAddresses(password)
      setPassword('')
      setNeedsPassword(false)
      await refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address')
    } finally {
      setIsGenerating(false)
    }
  }

  const cancelPassword = (): void => {
    setNeedsPassword(false)
    setPassword('')
    setPasswordError(null)
  }

  const transparentContent = (
    <div className='flex flex-col gap-4 pt-4'>
      <Text size='sm' dim>
        Your Platform Addresses. It is recommended to use different addresses for each transaction.
      </Text>

      {error != null && (
        <ValueCard colorScheme='red' size='xl'>
          <Text size='sm' color='red'>{error}</Text>
        </ValueCard>
      )}

      {hasLoaded && !isLoading && addresses.length === 0 && (
        <ValueCard colorScheme='lightGray' size='xl'>
          <Text size='sm' dim>No addresses yet. Create your first one below.</Text>
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

      {needsPassword
        ? (
          <div className='flex flex-col gap-3'>
            <Text size='sm' dim>
              Enter your password once to enable platform addresses for this wallet.
            </Text>
            <PasswordField
              value={password}
              onChange={(value) => { setPassword(value); setPasswordError(null) }}
              error={passwordError}
              autoFocus
            />
            <div className='flex gap-2'>
              <Button
                colorScheme='brand'
                className='flex-1'
                onClick={() => { void handleCreateWithPassword() }}
                disabled={isGenerating}
              >
                {isGenerating ? 'Creating...' : 'Create address'}
              </Button>
              <Button
                colorScheme='lightGray'
                className='flex-1'
                onClick={cancelPassword}
                disabled={isGenerating}
              >
                Cancel
              </Button>
            </div>
          </div>
          )
        : (
          <Button
            colorScheme='brand'
            onClick={() => { void handleCreate() }}
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? 'Loading...' : 'Add one more address'}
          </Button>
          )}
    </div>
  )

  return (
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
  )
}
