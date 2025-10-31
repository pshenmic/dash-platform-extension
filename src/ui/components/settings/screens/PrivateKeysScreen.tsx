import React, { useState, useEffect } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import {
  KeyIcon,
  Button,
  DeleteIcon,
  Text,
  ValueCard,
  Identifier,
  EyeOpenIcon,
  EyeClosedIcon,
  ChevronIcon
} from 'dash-ui-kit/react'
import { useExtensionAPI, useSigningKeys, useSdk } from '../../../hooks'
import { getPurposeLabel, getSecurityLabel } from '../../../../enums'
import { WalletType } from '../../../../types'
import { ConfirmDialog } from '../../controls'

interface PublicKey {
  keyId: number
  securityLevel: string
  purpose: string
  hash: string
  type: string
  data: string
  readOnly: boolean
}

const Badge: React.FC<{ text: string }> = ({ text }) => (
  <ValueCard
    colorScheme='lightGray'
    size='sm'
    className='p-2'
    border={false}
  >
    <Text monospace weight='medium' className='!text-[0.75rem]'>
      {text}
    </Text>
  </ValueCard>
)

const KeyActions: React.FC<{
  keyId: number
  onDelete: () => void
  onToggleShow: () => void
  showDelete: boolean
  isExpanded: boolean
  isPrivateKeyVisible: boolean
}> = ({
        keyId,
        onDelete,
        onToggleShow,
        showDelete,
        isExpanded,
        isPrivateKeyVisible
      }) => (
  <div className='flex items-center gap-1'>
    <Button
      onClick={(e) => {
        e.stopPropagation()
        onToggleShow()
      }}
      size='sm'
      colorScheme='lightGray'
      className='!min-h-0 flex items-center justify-center p-1 rounded'
      aria-label={`${isPrivateKeyVisible ? 'Hide' : 'Show'} private key ${keyId}`}
    >
      {isPrivateKeyVisible ? (
        <EyeClosedIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
      ) : (
        <EyeOpenIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
      )}
    </Button>
    {showDelete && (
      <Button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        size='sm'
        colorScheme='lightGray'
        className='!min-h-0 flex items-center justify-center p-1 rounded'
        aria-label={`Delete key ${keyId}`}
      >
        <DeleteIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
      </Button>
    )}
    <ChevronIcon
      className={`text-dash-primary-dark-blue shrink-0 w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
    />
  </div>
)

const PublicKeyItem: React.FC<{
  publicKey: PublicKey
  onDelete: (id: number) => void
  showDelete: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  privateKeyData: string | null
  isPrivateKeyVisible: boolean
  onTogglePrivateKeyVisibility: () => void
}> = ({
        publicKey,
        onDelete,
        showDelete,
        isExpanded,
        onToggleExpand,
        privateKeyData,
        isPrivateKeyVisible,
        onTogglePrivateKeyVisibility
      }) => (
  <div className='bg-gray-100 rounded-2xl p-3'>
    <div
      className='flex items-center justify-between cursor-pointer'
      onClick={onToggleExpand}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggleExpand()
        }
      }}
    >
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
        onToggleShow={onTogglePrivateKeyVisibility}
        showDelete={showDelete}
        isExpanded={isExpanded}
        isPrivateKeyVisible={isPrivateKeyVisible}
      />
    </div>

    {/* Expanded Content */}
    {isExpanded && (
      <div className='mt-3'>
        <ValueCard colorScheme='white' size='md' className='flex-col gap-4 space-y-4'>
          {/* Type and Read Only Row */}
          <div className='flex gap-2 w-full'>
            <ValueCard colorScheme='lightGray' size='sm' className='flex-1 flex-col items-start'>
              <Text size='sm' dim className='mb-2'>
                Type:
              </Text>
              <Badge text={publicKey.type} />
            </ValueCard>
            <ValueCard colorScheme='lightGray' size='sm' className='flex-col items-start w-[125px]'>
              <Text size='sm' dim className='mb-2'>
                Read Only:
              </Text>
              <ValueCard colorScheme={publicKey.readOnly ? 'yellow' : 'lightBlue'} size='sm' border={false}>
                <Text weight='medium' className={`!text-[0.75rem] ${publicKey.readOnly ? '!text-red-600' : '!text-blue-600'}`}>
                  {publicKey.readOnly ? 'True' : 'False'}
                </Text>
              </ValueCard>
            </ValueCard>
          </div>

          {/* Data and Public Key Hash */}
          <div className='space-y-4 w-full'>
            {/* Data (Public Key) */}
            <div className='flex items-center justify-between'>
              <Text size='sm' dim>
                Data:
              </Text>
              <Identifier
                middleEllipsis
                edgeChars={5}
                copyButton={true}
              >
                {publicKey.data}
              </Identifier>
            </div>

            {/* Public Key Hash */}
            <div className='flex items-center justify-between'>
              <Text size='sm' dim>
                Public Key Hash:
              </Text>
              <Identifier
                middleEllipsis
                edgeChars={5}
                copyButton={true}
              >
                {publicKey.hash}
              </Identifier>
            </div>

            {/* Private Key - shown when visible */}
            {isPrivateKeyVisible && privateKeyData != null && (
              <div className='flex items-center justify-between'>
                <Text size='sm' dim>
                  Private Key (WIF):
                </Text>
                <Identifier
                  middleEllipsis
                  edgeChars={5}
                  copyButton={true}
                >
                  {privateKeyData}
                </Identifier>
              </div>
            )}

            {isPrivateKeyVisible && privateKeyData == null && (
              <div className='flex items-center justify-between'>
                <Text size='sm' dim>
                  Private Key (WIF):
                </Text>
                <Text size='sm' dim>
                  Loading...
                </Text>
              </div>
            )}
          </div>
        </ValueCard>

        {/* Disable Public Key Button */}
        <div className='mt-3'>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(publicKey.keyId)
            }}
            variant='solid'
            colorScheme='brand'
            size='md'
            className='w-full'
          >
            Disable Public Key
          </Button>
        </div>
      </div>
    )}
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
  const sdk = useSdk()

  const [keyToDelete, setKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedKeyId, setExpandedKeyId] = useState<number | null>(null)
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<Set<number>>(new Set())
  const [privateKeysData, setPrivateKeysData] = useState<Map<number, string>>(new Map())
  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  const {
    signingKeys,
    loading: keysLoading,
    error: keysError,
    reload: reloadKeys
  } = useSigningKeys({
    identity: currentIdentity ?? null
  })

  // Load detailed key information from SDK
  useEffect(() => {
    const loadDetailedKeys = async (): Promise<void> => {
      if (currentIdentity == null || signingKeys.length === 0) {
        setPublicKeys([])
        return
      }

      try {
        setDetailsLoading(true)
        const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)

        const detailedKeys: PublicKey[] = signingKeys
          .filter(key => key.keyId !== null)
          .map(key => {
            // Find matching key from SDK to get additional data
            const sdkKey = identityPublicKeys.find((pk: any) => {
              const pkId = pk?.keyId ?? pk?.getId?.() ?? null
              return pkId === key.keyId
            })

            return {
              keyId: key.keyId,
              securityLevel: getSecurityLabel(key.securityLevel),
              purpose: getPurposeLabel(key.purpose),
              hash: key.hash,
              type: sdkKey?.keyType ? String(sdkKey.keyType) : 'Unknown',
              data: sdkKey?.data ? String(sdkKey.data) : '',
              readOnly: sdkKey?.readOnly ?? false
            }
          })

        setPublicKeys(detailedKeys)
      } catch (error) {
        console.error('Failed to load detailed key information:', error)

        // Show error to user instead of mock data
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(`Failed to load key details from SDK: ${errorMessage}`)

        // Clear keys list since we don't have complete data
        setPublicKeys([])
      } finally {
        setDetailsLoading(false)
      }
    }

    void loadDetailedKeys()
  }, [currentIdentity, signingKeys, sdk])

  useEffect(() => {
    if (error != null) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error])

  const handleToggleExpand = (keyId: number): void => {
    setExpandedKeyId(prev => prev === keyId ? null : keyId)
  }

  const handleTogglePrivateKeyVisibility = async (keyId: number): Promise<void> => {
    if (currentIdentity == null) {
      console.log('No identity selected')
      return
    }

    const isVisible = visiblePrivateKeys.has(keyId)

    if (isVisible) {
      // Hide the private key
      setVisiblePrivateKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(keyId)
        return newSet
      })
    } else {
      // Show the private key - fetch if not already cached
      setVisiblePrivateKeys(prev => new Set(prev).add(keyId))

      if (!privateKeysData.has(keyId)) {
        // Ask for password to export private key
        const password = prompt('Enter your password to view the private key:')

        if (password == null || password.trim() === '') {
          // User cancelled or entered empty password
          setVisiblePrivateKeys(prev => {
            const newSet = new Set(prev)
            newSet.delete(keyId)
            return newSet
          })
          return
        }

        try {
          // Fetch the private key from the extension API using exportPrivateKey
          const response = await extensionAPI.exportPrivateKey(currentIdentity, keyId, password)

          console.log('exptor Private Key Response:', response)

          setPrivateKeysData(prev => new Map(prev).set(keyId, response.wif))
        } catch (error) {
          console.error('Failed to fetch private key:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          setError(`Failed to fetch private key: ${errorMessage}`)

          // Remove from visible set if fetch failed
          setVisiblePrivateKeys(prev => {
            const newSet = new Set(prev)
            newSet.delete(keyId)
            return newSet
          })
        }
      }
    }
  }

  const handleDeleteKey = (keyId: number): void => {
    if (currentIdentity == null) {
      console.log('No identity selected for key deletion')
      return
    }

    setKeyToDelete(keyId)
  }

  const confirmDeleteKey = async (): Promise<void> => {
    if (keyToDelete == null || currentIdentity == null) {
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
        {currentIdentity != null && (
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

      {(keysLoading || detailsLoading) && (
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
      {currentIdentity == null && !keysLoading && !detailsLoading && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No identity selected</Text>
          </ValueCard>
        </div>
      )}

      {/* No Keys State */}
      {!keysLoading && !detailsLoading && keysError == null && currentIdentity != null && publicKeys.length === 0 && (
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>No public keys available for this identity</Text>
          </ValueCard>
        </div>
      )}

      {/* Public Keys List */}
      {!keysLoading && !detailsLoading && keysError == null && publicKeys.length > 0 && (
        <div className='flex-1 px-4 space-y-2.5'>
          {publicKeys.map((publicKey, index) => (
            <PublicKeyItem
              key={`${publicKey.keyId}-${publicKey.hash}`}
              publicKey={publicKey}
              onDelete={handleDeleteKey}
              showDelete={shouldShowDelete}
              isExpanded={expandedKeyId === publicKey.keyId}
              onToggleExpand={() => handleToggleExpand(publicKey.keyId)}
              privateKeyData={privateKeysData.get(publicKey.keyId) ?? null}
              isPrivateKeyVisible={visiblePrivateKeys.has(publicKey.keyId)}
              onTogglePrivateKeyVisibility={() => { void handleTogglePrivateKeyVisibility(publicKey.keyId) }}
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
        open={keyToDelete != null}
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
