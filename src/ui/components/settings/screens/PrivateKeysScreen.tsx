import React, { useState, useEffect } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { KeyIcon, Button, DeleteIcon, Text, ValueCard } from 'dash-ui/react'
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
const KeyActions: React.FC<{ keyId: number, onDelete: () => Promise<void> }> = ({
  keyId,
  onDelete
}) => (
  <div className='flex items-center gap-1'>
    <Button
      onClick={() => void onDelete()}
      size='sm'
      colorScheme='lightGray'
      className='!min-h-0 flex items-center justify-center p-1 rounded'
      aria-label={`Delete key ${keyId}`}
    >
      <DeleteIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
    </Button>
  </div>
)

// Main public key item component
const PublicKeyItem: React.FC<{
  publicKey: PublicKey
  onDelete: (id: number) => Promise<void>
}> = ({ publicKey, onDelete }) => (
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
  content: []
}

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, selectedNetwork, onItemSelect }) => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [keysState, loadKeys] = useAsyncState<PublicKey[]>()

  // Load wallet info
  useEffect(() => {
    const loadWalletInfo = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setSelectedWallet(status.currentWalletId)
      } catch (error) {
        console.warn('Failed to load wallet info:', error)
      }
    }

    void loadWalletInfo()
  }, [extensionAPI])

  // Load public keys
  useEffect(() => {
    if (selectedWallet === null || selectedWallet === '' || selectedNetwork === null || selectedNetwork === '' || currentIdentity === null || currentIdentity === '') return

    void loadKeys(async () => {
      const allWallets = await extensionAPI.getAllWallets()
      const wallet = allWallets.find(w => w.walletId === selectedWallet && w.network === selectedNetwork)
      if (wallet == null) throw new Error('Wallet not found')

      const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity!)
      const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity!)

      // Filter identity public keys to only show those that are available
      const availablePublicKeys = identityPublicKeys.filter((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        return keyId !== null && keyId !== undefined && availableKeyIds.includes(keyId)
      })

      const keys: PublicKey[] = availablePublicKeys.map((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        const purpose = String(key?.purpose ?? 'UNKNOWN')
        const security = String(key?.securityLevel ?? 'UNKNOWN')
        let hash = ''
        try {
          hash = typeof key?.getPublicKeyHash === 'function' ? key.getPublicKeyHash() : ''
        } catch {}

        return {
          keyId: keyId ?? 0,
          securityLevel: getSecurityLabel(security),
          purpose: getPurposeLabel(purpose),
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

  const handleDeleteKey = async (keyId: number): Promise<void> => {
    if (currentIdentity === null || currentIdentity === '') {
      console.warn('No identity selected for key deletion')
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete private key with ID ${keyId}? This action cannot be undone.`
    )
    
    if (!confirmed) {
      return
    }

    try {
      await extensionAPI.removeIdentityPrivateKey(currentIdentity!, keyId)
      
      // Refresh the keys list after successful deletion
      void loadKeys(async () => {
        const allWallets = await extensionAPI.getAllWallets()
        const wallet = allWallets.find(w => w.walletId === selectedWallet && w.network === selectedNetwork)
        if (wallet == null) throw new Error('Wallet not found')

        const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity!)
        const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity!)

        // Filter identity public keys to only show those that are available
        const availablePublicKeys = identityPublicKeys.filter((key: any) => {
          const keyId = key?.keyId ?? key?.getId?.() ?? null
          return keyId !== null && keyId !== undefined && availableKeyIds.includes(keyId)
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
            keyId: keyId ?? 0,
            securityLevel: securityLabel,
            purpose: purposeLabel,
            hash
          }
        })

        return keys
      })
    } catch (error) {
      console.error('Failed to delete private key:', error)
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to delete private key: ${errorMessage}`)
    }
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
      {keysState.error !== null && keysState.error !== '' && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='red' size='xl'>
            <Text size='md' color='red'>Error loading public keys: {keysState.error}</Text>
          </ValueCard>
        </div>
      )}

      {/* No Identity State */}
      {(currentIdentity === null || currentIdentity === '') && !keysState.loading && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No identity selected</Text>
          </ValueCard>
        </div>
      )}

      {/* No Keys State */}
      {!keysState.loading && (keysState.error === null || keysState.error === '') && currentIdentity !== null && currentIdentity !== '' && publicKeys.length === 0 && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No public keys available for this identity</Text>
          </ValueCard>
        </div>
      )}

      {/* Public Keys List */}
      {!keysState.loading && (keysState.error === null || keysState.error === '') && publicKeys.length > 0 && (
        <div className='flex-1 px-4 space-y-2.5'>
          {publicKeys.map((publicKey, index) => (
            <PublicKeyItem
              key={`${publicKey.keyId}-${publicKey.hash}`}
              publicKey={publicKey}
              onDelete={handleDeleteKey}
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
