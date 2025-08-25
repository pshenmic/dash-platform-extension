import React, { useState, useEffect } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { KeyIcon, EyeOpenIcon, EyeClosedIcon, DeleteIcon, Text, ValueCard } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useSdk } from '../../../hooks/useSdk'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { getPurposeLabel, getSecurityLabel } from '../../../../enums'

interface PublicKey {
  keyId: number
  securityLevel: string
  purpose: string
  hash: string
}

// Component for rendering badge
const Badge: React.FC<{ text: string }> = ({ text }) => (
  <ValueCard
    colorScheme='lightGray'
    size='sm'
    className='p-2'
  >
    <Text size='sm' weight='medium'>
      {text}
    </Text>
  </ValueCard>
)

// Component for key action buttons
const KeyActions: React.FC<{ keyId: number, onView: () => void, onDelete: () => void }> = ({
  keyId,
  onView,
  onDelete
}) => (
  <div className='flex items-center gap-1'>
    <button
      onClick={onView}
      className='flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors'
      aria-label={`View key ${keyId}`}
    >
      <EyeOpenIcon className='text-dash-primary-dark-blue' />
    </button>
    <button
      onClick={onDelete}
      className='flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors'
      aria-label={`Delete key ${keyId}`}
    >
      <DeleteIcon className='text-dash-primary-dark-blue' />
    </button>
  </div>
)

// Main public key item component
const PublicKeyItem: React.FC<{
  publicKey: PublicKey
  onView: (id: number) => void
  onDelete: (id: number) => void
  showSeparator?: boolean
}> = ({ publicKey, onView, onDelete, showSeparator = true }) => (
  <div className='bg-gray-100 rounded-2xl p-3'>
    <div className='flex items-center justify-between'>
      <div className='flex items-center flex-wrap gap-2 flex-1 w-full'>
        {/* Key Icon */}
        <div className='flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full'>
          <KeyIcon size={10} className='text-gray-700' />
        </div>

        {/* Key ID */}
        <Text size='sm' weight='medium' className='text-gray-900'>
          Key ID: {publicKey.keyId}
        </Text>

        {/* Badges */}
        <div className='flex items-center gap-2'>
          <Badge text={publicKey.securityLevel} />
          <Badge text={publicKey.purpose} />
        </div>
      </div>
      <KeyActions
        keyId={publicKey.keyId}
        onView={() => onView(publicKey.keyId)}
        onDelete={() => onDelete(publicKey.keyId)}
      />
    </div>
  </div>
)

// Public Keys screen configuration
export const privateKeysScreenConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Public Keys',
  category: 'wallet',
  content: [] // Content will be generated dynamically
}

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, onItemSelect }) => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [keysState, loadKeys] = useAsyncState<PublicKey[]>()

  // Load wallet and network info
  useEffect(() => {
    const loadWalletInfo = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setSelectedWallet(status.currentWalletId)
        setSelectedNetwork(status.network)
      } catch (error) {
        console.warn('Failed to load wallet info:', error)
      }
    }

    void loadWalletInfo()
  }, [extensionAPI])

  // Load public keys
  useEffect(() => {
    if (!selectedWallet || !selectedNetwork || !currentIdentity) return

    void loadKeys(async () => {
      const allWallets = await extensionAPI.getAllWallets()
      const wallet = allWallets.find(w => w.walletId === selectedWallet && w.network === selectedNetwork)
      if (wallet == null) throw new Error('Wallet not found')

      const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)
      const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity)

      // Filter identity public keys to only show those that are available
      const availablePublicKeys = identityPublicKeys.filter((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        return keyId != null && availableKeyIds.includes(keyId)
      })

      const keys: PublicKey[] = availablePublicKeys.map((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        const purpose = String(key?.purpose ?? 'UNKNOWN')
        const security = String(key?.securityLevel ?? 'UNKNOWN')
        let hash = ''
        try {
          hash = typeof key?.getPublicKeyHash === 'function' ? key.getPublicKeyHash() : ''
        } catch {}

        // Get labels using helper functions
        const purposeLabel = getPurposeLabel(purpose)
        const securityLabel = getSecurityLabel(security)

        return {
          keyId: keyId || 0,
          securityLevel: securityLabel,
          purpose: purposeLabel,
          hash
        }
      })

      return keys
    })
  }, [selectedWallet, selectedNetwork, currentIdentity, extensionAPI, sdk, loadKeys])

  // Update local state when keys are loaded
  useEffect(() => {
    if (keysState.data != null) {
      setPublicKeys(keysState.data)
    } else {
      setPublicKeys([])
    }
  }, [keysState.data])

  const handleViewKey = (keyId: number): void => {
    console.log(`View public key: ${keyId}`)
    // TODO: Implement view key functionality (show public key details in modal)
  }

  const handleDeleteKey = (keyId: number): void => {
    console.log(`Delete public key: ${keyId}`)
    // TODO: Implement delete key functionality with confirmation
  }

  const handleImportPrivateKeys = (): void => {
    // Navigate to the import private keys settings screen
    onItemSelect?.('import-private-keys-settings')
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Description */}
      <div className='px-4 mb-6'>
        <p className='text-sm font-medium text-gray-600'>
          Manage public keys available for the current identity.
        </p>
      </div>

      {/* Loading State */}
      {keysState.loading && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>Loading public keys...</Text>
          </ValueCard>
        </div>
      )}

      {/* Error State */}
      {keysState.error && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='red' size='xl'>
            <Text size='md' color='red'>Error loading public keys: {keysState.error}</Text>
          </ValueCard>
        </div>
      )}

      {/* No Identity State */}
      {!currentIdentity && !keysState.loading && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No identity selected</Text>
          </ValueCard>
        </div>
      )}

      {/* No Keys State */}
      {!keysState.loading && !keysState.error && currentIdentity && publicKeys.length === 0 && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No public keys available for this identity</Text>
          </ValueCard>
        </div>
      )}

      {/* Public Keys List */}
      {!keysState.loading && !keysState.error && publicKeys.length > 0 && (
        <div className='flex-1 px-4 space-y-2.5'>
          {publicKeys.map((publicKey, index) => (
            <PublicKeyItem
              key={`${publicKey.keyId}-${publicKey.hash}`}
              publicKey={publicKey}
              onView={handleViewKey}
              onDelete={handleDeleteKey}
              showSeparator={index < publicKeys.length - 1}
            />
          ))}
        </div>
      )}

      {/* Import Button */}
      <div className='p-4 mt-auto'>
        <button
          onClick={handleImportPrivateKeys}
          className='w-full bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl px-6 py-3'
        >
          <span className='text-base font-medium text-blue-600'>
            Import Private Keys
          </span>
        </button>
      </div>
    </div>
  )
}
