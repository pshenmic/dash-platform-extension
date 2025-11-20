import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { base64 } from '@scure/base'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import {
  KeyIcon,
  Button,
  DeleteIcon,
  Text,
  ValueCard,
  Identifier,
  EyeOpenIcon,
  ChevronIcon
} from 'dash-ui-kit/react'
import { useExtensionAPI, useSigningKeys, useSdk } from '../../../hooks'
import { getPurposeLabel, getSecurityLabel } from '../../../../enums'
import { WalletType } from '../../../../types'
import { ConfirmDialog } from '../../controls'
import { PrivateKeyDialog, DisableKeyDialog, type PublicKey } from '../../keys'

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
      <EyeOpenIcon className='text-dash-primary-dark-blue shrink-0 w-3 h-3' />
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
  onDisable: (id: number) => void
  showDelete: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  privateKeyData: string | null
  isPrivateKeyVisible: boolean
  onTogglePrivateKeyVisibility: () => void
}> = ({
  publicKey,
  onDelete,
  onDisable,
  showDelete,
  isExpanded,
  onToggleExpand,
  privateKeyData,
  isPrivateKeyVisible,
  onTogglePrivateKeyVisibility
}) => {
  const isDisabled = publicKey.disabledAt != null

  return (
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
          <div className={`flex items-center justify-center w-5 h-5 rounded-full ${isDisabled ? 'bg-red-100' : 'bg-gray-100'}`}>
            <KeyIcon size={10} className={isDisabled ? 'text-red-600' : 'text-gray-700'} />
          </div>

          <Text size='sm' weight='medium' className={isDisabled ? 'text-red-600' : 'text-gray-900'}>
            Key ID: {publicKey.keyId}
          </Text>

          <div className='flex items-center gap-2'>
            {isDisabled && (
              <ValueCard colorScheme='red' size='sm' className='p-2' border={false}>
                <Text monospace weight='medium' className='!text-[0.75rem] !text-red-600'>
                  DISABLED
                </Text>
              </ValueCard>
            )}
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
                  copyButton
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
                  copyButton
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
                    copyButton
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

          {/* Disable Public Key Button or Disabled Notice */}
          <div className='mt-3'>
            {isDisabled
              ? (
                <ValueCard colorScheme='red' className='p-4'>
                  <Text size='sm' weight='medium' className='text-center !text-red-600'>
                    This key is permanently disabled and cannot be re-enabled
                  </Text>
                </ValueCard>
                )
              : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDisable(publicKey.keyId)
                  }}
                  variant='solid'
                  colorScheme='red'
                  size='md'
                  className='w-full'
                >
                  Disable Public Key
                </Button>
                )}
          </div>
        </div>
      )}
    </div>
  )
}

// Public Keys screen configuration
export const privateKeysScreenConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Public Keys',
  category: 'wallet',
  content: []
}

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, currentWallet, onItemSelect, onClose }) => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const navigate = useNavigate()

  const [keyToDelete, setKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedKeyId, setExpandedKeyId] = useState<number | null>(null)
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<Set<number>>(new Set())
  const [privateKeysData, setPrivateKeysData] = useState<Map<number, string>>(new Map())
  const [publicKeys, setPublicKeys] = useState<PublicKey[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Private Key Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedKeyForDialog, setSelectedKeyForDialog] = useState<number | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Disable Key Dialog state
  const [disableKeyDialogOpen, setDisableKeyDialogOpen] = useState(false)
  const [keyToDisable, setKeyToDisable] = useState<number | null>(null)
  const [disableKeyLoading, setDisableKeyLoading] = useState(false)

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
              type: (sdkKey?.keyType != null) ? String(sdkKey.keyType) : 'Unknown',
              data: (sdkKey?.data != null) ? String(sdkKey.data) : '',
              readOnly: sdkKey?.readOnly ?? false,
              disabledAt: sdkKey?.disabledAt != null ? Number(sdkKey.disabledAt) : null
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
      // Open dialog to show private key
      setSelectedKeyForDialog(keyId)
      setDialogOpen(true)
      setDialogError(null)
    }
  }

  const handleSubmitPassword = async (password: string): Promise<void> => {
    if (currentIdentity == null || selectedKeyForDialog == null) {
      return
    }

    setDialogLoading(true)
    setDialogError(null)

    try {
      // Fetch the private key from the extension API using exportPrivateKey
      const response = await extensionAPI.exportPrivateKey(currentIdentity, selectedKeyForDialog, password)

      setPrivateKeysData(prev => new Map(prev).set(selectedKeyForDialog, response.wif))
      setVisiblePrivateKeys(prev => new Set(prev).add(selectedKeyForDialog))
    } catch (error) {
      console.error('Failed to fetch private key:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setDialogError(`Failed to fetch private key: ${errorMessage}`)
      throw error
    } finally {
      setDialogLoading(false)
    }
  }

  const handleCloseDialog = (): void => {
    setDialogOpen(false)
    setSelectedKeyForDialog(null)
    setDialogError(null)
    setDialogLoading(false)
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

  const handleDisablePublicKey = async (): Promise<void> => {
    if (currentIdentity == null || keyToDisable == null) {
      console.log('No identity or key selected for disabling')
      return
    }

    try {
      setDisableKeyLoading(true)

      // Get the current identity from the network
      const identity = await sdk.identities.getIdentityByIdentifier(currentIdentity)

      // Get the current identity nonce
      const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)

      // Get the next revision from the identity (current + 1)
      const currentRevision = BigInt(identity.revision)
      const nextRevision = currentRevision + BigInt(1)

      // Create state transition to disable the public key
      const stateTransition = sdk.identities.createStateTransition('update', {
        identityId: currentIdentity,
        disablePublicKeyIds: [keyToDisable],
        addPublicKeys: [],
        identityNonce: identityNonce + 1n,
        revision: nextRevision
      })

      // Serialize state transition to base64
      const stateTransitionBytes = stateTransition.bytes()
      const stateTransitionBase64 = base64.encode(stateTransitionBytes)

      // Save state transition to storage
      const response = await extensionAPI.createStateTransition(stateTransitionBase64)

      // Close dialog
      setDisableKeyDialogOpen(false)
      setKeyToDisable(null)

      // Redirect to approval page with returnToHome flag
      void navigate(`/approve/${response.stateTransition.hash}`, {
        state: {
          returnToHome: true
        }
      })

      // Close settings menu
      onClose()
    } catch (error) {
      console.error('Failed to disable public key:', error)

      // Keep dialog open on error so user can try again
      setDisableKeyDialogOpen(false)
      setKeyToDisable(null)

      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
        // Try to extract more readable error from RPC errors
        if (errorMessage.includes('RpcError') || errorMessage.includes('serializedError')) {
          errorMessage = 'Network error: Unable to broadcast transaction. Please check your identity state and try again.'
        }
      }

      setError(`Failed to create disable key transaction: ${errorMessage}`)
    } finally {
      setDisableKeyLoading(false)
    }
  }

  const handleOpenDisableDialog = (keyId: number): void => {
    setKeyToDisable(keyId)
    setDisableKeyDialogOpen(true)
  }

  const handleImportPrivateKeys = (): void => {
    onItemSelect?.('import-private-keys-settings')
  }

  const handleCreateKey = (): void => {
    onItemSelect?.('create-key-settings')
  }

  const isKeystoreWallet = currentWallet?.type === WalletType.keystore
  const isSeedPhraseWallet = currentWallet?.type === WalletType.seedphrase
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
              onDisable={handleOpenDisableDialog}
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

      {/* Action Buttons */}
      {(isKeystoreWallet || isSeedPhraseWallet) && (
        <div className='p-4 mt-auto'>
          <div className='flex gap-2'>
            {/* Import Button - Only show for keystore wallets */}
            {isKeystoreWallet && (
              <button
                onClick={handleImportPrivateKeys}
                className='flex-1 bg-blue-600 hover:bg-blue-700 transition-colors rounded-2xl px-6 py-3'
              >
                <span className='text-base font-medium text-white'>
                  Import Private Key
                </span>
              </button>
            )}

            {/* Create Key Button - Only show for seed phrase wallets */}
            <button
              onClick={handleCreateKey}
              className='flex-1 bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl px-6 py-3'
            >
              <span className='text-base font-medium text-blue-600'>
                Create New Key
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Private Key Dialog */}
      <PrivateKeyDialog
        isOpen={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
        publicKey={publicKeys.find(k => k.keyId === selectedKeyForDialog) ?? null}
        onSubmitPassword={async (password) => await handleSubmitPassword(password)}
        privateKeyData={selectedKeyForDialog != null ? privateKeysData.get(selectedKeyForDialog) ?? null : null}
        isLoading={dialogLoading}
        error={dialogError}
      />

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

      {/* Disable Key Dialog */}
      <DisableKeyDialog
        isOpen={disableKeyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDisableKeyDialogOpen(false)
            setKeyToDisable(null)
          }
        }}
        publicKey={keyToDisable != null ? publicKeys.find(k => k.keyId === keyToDisable) ?? null : null}
        onConfirm={() => { void handleDisablePublicKey() }}
        isLoading={disableKeyLoading}
      />
    </div>
  )
}
