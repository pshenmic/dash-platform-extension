import React, { useState, useEffect } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { KeyIcon, Button, DeleteIcon, Text, ValueCard, Identifier } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useSdk } from '../../../hooks/useSdk'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { getPurposeLabel, getSecurityLabel } from '../../../../enums'
import { WalletType } from '../../../../types'
import { ConfirmDialog } from '../../controls'

interface PublicKey {
  keyId: number
  securityLevel: string
  purpose: string
  hash: string
}

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

const KeyActions: React.FC<{ keyId: number, onDelete: () => void, showDelete: boolean }> = ({
  keyId,
  onDelete,
  showDelete
}) => (
  <div className='flex items-center gap-1'>
    {showDelete && (
      <Button
        onClick={onDelete}
        size='sm'
        colorScheme='lightGray'
        className='!min-h-0 flex items-center justify-center p-1 rounded'
        aria-label={`Delete key ${keyId}`}
      >
        <DeleteIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
      </Button>
    )}
  </div>
)

const PublicKeyItem: React.FC<{
  publicKey: PublicKey
  onDelete: (id: number) => void
  showDelete: boolean
}> = ({ publicKey, onDelete, showDelete }) => (
  <div className='bg-gray-100 rounded-2xl p-3'>
    <div className='flex items-center justify-between'>
      <div className='flex items-center flex-wrap gap-2 flex-1 w-full'>
        <div className='flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full'>
          <KeyIcon size={10} className='text-gray-700' />
        </div>

        <Text size='sm' weight='medium' className='text-gray-900'>
          Key ID: {publicKey.keyId}
        </Text>

        <div className='flex items-center gap-2'>
          <Badge text={publicKey.securityLevel} />
          <Badge text={publicKey.purpose} />
        </div>
      </div>
      <KeyActions
        keyId={publicKey.keyId}
        onDelete={() => onDelete(publicKey.keyId)}
        showDelete={showDelete}
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

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, currentNetwork, currentWallet, onItemSelect }) => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([])
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null)
  const [keysState, loadKeys] = useAsyncState<PublicKey[]>()
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load wallet info
  useEffect(() => {
    const loadWalletInfo = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setCurrentWalletId(status.currentWalletId)
      } catch (error) {
        console.warn('Failed to load wallet info:', error)
      }
    }

    void loadWalletInfo().catch(error => {
      console.warn('Failed to load wallet info:', error)
    })
  }, [extensionAPI])

  // Helper to fetch available public keys for current identity/wallet
  const fetchAvailablePublicKeys = async (): Promise<PublicKey[]> => {
    const allWallets = await extensionAPI.getAllWallets()
    const wallet = allWallets.find(w => w.walletId === currentWalletId && w.network === currentNetwork)
    if (wallet == null) throw new Error('Wallet not found')

    if (currentIdentity == null) throw new Error('No current identity')

    const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)
    const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity)

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
  }

  // Load public keys
  useEffect(() => {
    if (currentWalletId === null || currentNetwork === null || currentIdentity === null) return
    void loadKeys(fetchAvailablePublicKeys).catch(error => {
      console.warn('Failed to load public keys:', error)
    })
  }, [currentWalletId, currentNetwork, currentIdentity, extensionAPI, sdk, loadKeys])

  // Update local state when keys are loaded
  useEffect(() => {
    if (keysState.data != null) {
      setPublicKeys(keysState.data)
    } else {
      setPublicKeys([])
    }
  }, [keysState.data])

  useEffect(() => {
    if (error !== null && error !== '') {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error])

  const handleDeleteKey = (keyId: number): void => {
    if (currentIdentity === null || currentIdentity === '') {
      console.warn('No identity selected for key deletion')
      return
    }

    setKeyToDelete(keyId)
  }

  const confirmDeleteKey = async (): Promise<void> => {
    if (keyToDelete === null || currentIdentity == null || currentIdentity === '') {
      return
    }

    try {
      await extensionAPI.removeIdentityPrivateKey(currentIdentity, keyToDelete)

      // Refresh the keys list after successful deletion
      void loadKeys(fetchAvailablePublicKeys).catch(error => {
        console.warn('Failed to reload public keys after deletion:', error)
      })
    } catch (error) {
      console.error('Failed to delete private key:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to delete private key: ${errorMessage}`)
    }
  }

  const handleImportPrivateKeys = (): void => {
    onItemSelect?.('import-private-keys-settings')
  }

  const isKeystoreWallet = currentWallet?.type === WalletType.keystore
  const shouldShowDelete = isKeystoreWallet && publicKeys.length > 1

  return (
    <div className='flex flex-col h-full'>
      <div className='px-4 mb-6'>
        <Text size='sm' dim>
          Manage public keys available for the current identity:
        </Text>
        {currentIdentity !== null && currentIdentity !== '' && (
          <Identifier
            key={currentIdentity}
            middleEllipsis
            edgeChars={8}
            highlight='both'
            avatar
          >
            {currentIdentity}
          </Identifier>
        )}
      </div>

      {keysState.loading && (
        <div className='px-4 mb-4'>
          <Text size='md' opacity='50'>Loading public keys...</Text>
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
              showDelete={shouldShowDelete}
            />
          ))}
        </div>
      )}

      {/* Delete Error State */}
      {error !== null && error !== '' && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='red' size='xl'>
            <Text size='md' color='red'>{error}</Text>
          </ValueCard>
        </div>
      )}

      {/* Import Button - Only show for keystore wallets */}
      {isKeystoreWallet && (
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
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={keyToDelete !== null}
        onOpenChange={(open) => { if (!open) setKeyToDelete(null) }}
        title='Delete Private Key'
        message={`Are you sure you want to delete private key with ID ${keyToDelete ?? 'unknown'}? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        onConfirm={() => { void confirmDeleteKey().catch(error => console.error('Delete key error:', error)) }}
      />
    </div>
  )
}
