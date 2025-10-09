import React, { useState, useEffect } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { KeyIcon, Button, DeleteIcon, Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import { useExtensionAPI, useSigningKeys } from '../../../hooks'
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

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, currentWallet, onItemSelect }) => {
  const extensionAPI = useExtensionAPI()

  const [keyToDelete, setKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    signingKeys,
    loading: keysLoading,
    error: keysError,
    reload: reloadKeys
  } = useSigningKeys({
    identity: currentIdentity ?? null
  })

  // Transform signing keys to the format expected by this screen
  const publicKeys: PublicKey[] = signingKeys
    .filter(key => key.keyId !== null)
    .map(key => ({
      keyId: key.keyId,
      securityLevel: getSecurityLabel(key.securityLevel),
      purpose: getPurposeLabel(key.purpose),
      hash: key.hash
    }))

  useEffect(() => {
    if (error != null) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error])

  const handleDeleteKey = (keyId: number): void => {
    if (currentIdentity === null) {
      console.log('No identity selected for key deletion')
      return
    }

    setKeyToDelete(keyId)
  }

  const confirmDeleteKey = async (): Promise<void> => {
    if (keyToDelete === null || currentIdentity == null) {
      return
    }

    try {
      await extensionAPI.removeIdentityPrivateKey(currentIdentity, keyToDelete)

      // Refresh the keys list after successful deletion
      reloadKeys()
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
        {currentIdentity !== null && (
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

      {keysLoading && (
        <div className='px-4 mb-4'>
          <Text size='md' opacity='50'>Loading public keys...</Text>
        </div>
      )}

      {/* Error State */}
      {keysError != null && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='red' size='xl'>
            <Text size='md' color='red'>Error loading public keys: {keysError}</Text>
          </ValueCard>
        </div>
      )}

      {/* No Identity State */}
      {(currentIdentity === null || currentIdentity === '') && !keysLoading && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No identity selected</Text>
          </ValueCard>
        </div>
      )}

      {/* No Keys State */}
      {!keysLoading && keysError == null && currentIdentity !== null && currentIdentity !== '' && publicKeys.length === 0 && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No public keys available for this identity</Text>
          </ValueCard>
        </div>
      )}

      {/* Public Keys List */}
      {!keysLoading && keysError == null && publicKeys.length > 0 && (
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
      {error != null && (
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
        onOpenChange={(open) => {
          if (!open) setKeyToDelete(null)
        }}
        title='Delete Private Key'
        message={`Are you sure you want to delete private key with ID ${keyToDelete ?? 'unknown'}? This will delete private key from a extension but not disable from the Identity.`}
        confirmText='Delete'
        cancelText='Cancel'
        onConfirm={() => { void confirmDeleteKey().catch(error => console.error('Delete key error:', error)) }}
      />
    </div>
  )
}
