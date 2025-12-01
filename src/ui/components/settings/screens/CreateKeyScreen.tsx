import React, { useState, useEffect } from 'react'
import { base64 } from '@scure/base'
import { Text, Button, ValueCard, Identifier, Input, InfoCircleIcon } from 'dash-ui-kit/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { WalletType } from '../../../../types'
import { useExtensionAPI, useSdk, useSigningKeys } from '../../../hooks'
import { KeyType } from 'pshenmic-dpp'
import { InfoCard } from '../../common'
import { TransactionSuccessScreen } from '../../layout/TransactionSuccessScreen'
import { CreateIdentityPrivateKeyResponse } from '../../../../types/messages/response/CreateIdentityPrivateKeyResponse'
import { hexToBytes } from '../../../../utils'
import { SelectField } from '../../controls'
import { KEY_TYPES, PURPOSES, SECURITY_LEVELS, READ_ONLY_OPTIONS } from '../../../constants/keyCreationOptions'
import { PublicKeySelect, type KeyRequirement } from '../../keys'

export const createKeyScreenConfig: ScreenConfig = {
  id: 'create-key-settings',
  title: 'Create Public Key',
  category: 'wallet',
  content: []
}

export const CreateKeyScreen: React.FC<SettingsScreenProps> = ({
  currentIdentity,
  currentWallet,
  currentNetwork,
  onBack,
  onClose
}) => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [keyType, setKeyType] = useState<string>('ECDSA_SECP256K1')
  const [purpose, setPurpose] = useState<number>(0)
  const [securityLevel, setSecurityLevel] = useState<number>(2)
  const [readOnly, setReadOnly] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const {
    signingKeys,
    selectedSigningKey,
    setSelectedSigningKey,
    loading: signingKeysLoading,
    error: signingKeysError
  } = useSigningKeys({
    identity: currentIdentity ?? null
  })

  // Clear error after 5 seconds
  useEffect(() => {
    if (error != null) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error])

  const handleCreateKey = async (): Promise<void> => {
    if (currentIdentity == null) {
      setError('No identity selected')
      return
    }

    if (currentWallet == null) {
      setError('No wallet selected')
      return
    }

    if (password.trim() === '') {
      setError('Password is required')
      return
    }

    if (selectedSigningKey == null) {
      setError('Please select a signing key')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      // Verify password first
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setError('Invalid password')
        return
      }

      const createPrivateKeyResponse: CreateIdentityPrivateKeyResponse = await extensionAPI.createIdentityPrivateKey(
        currentIdentity,
        password,
        keyType
      )

      const identity = await sdk.identities.getIdentityByIdentifier(currentIdentity)
      const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)
      const currentRevision = BigInt(identity.revision)

      let signature

      if (keyType === 'ECDSA_SECP256K1') {
        if (createPrivateKeyResponse.signature == null) {
          setError('Signature is missing from creating private key response')
          return
        }

        signature = hexToBytes(createPrivateKeyResponse.signature)
      }

      const keyTypeEnum = KeyType[keyType]
      const publicKeyToAdd = {
        id: createPrivateKeyResponse.keyId,
        keyType: keyTypeEnum,
        purpose,
        securityLevel,
        data: hexToBytes(createPrivateKeyResponse.publicKeyData),
        readOnly,
        signature
      }

      const stateTransition = sdk.identities.createStateTransition('update', {
        identityId: currentIdentity,
        disablePublicKeyIds: [],
        addPublicKeys: [publicKeyToAdd],
        identityNonce: identityNonce + 1n,
        revision: currentRevision + 1n
      })

      const stateTransitionBytes = stateTransition.bytes()
      const stateTransitionBase64 = base64.encode(stateTransitionBytes)

      // Create state transition in storage
      const createResponse = await extensionAPI.createStateTransition(stateTransitionBase64)

      // Sign and broadcast
      const keyId = Number(selectedSigningKey)
      const approveResponse = await extensionAPI.approveStateTransition(
        createResponse.stateTransition.hash,
        currentIdentity,
        keyId,
        password
      )

      setTxHash(approveResponse.txHash)
    } catch (e) {
      console.error('Failed to create key:', e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const isSeedPhraseWallet = currentWallet?.type === WalletType.seedphrase

  // Success screen after transaction is broadcasted
  if (txHash != null) {
    return (
      <TransactionSuccessScreen
        txHash={txHash}
        network={(currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'}
        title='Key Created Successfully'
        description='Your new public key has been added and the transaction was successfully broadcasted'
        onClose={() => {
          if (onClose != null) {
            onClose()
          }
        }}
      />
    )
  }

  return (
    <div className='flex flex-col h-full gap-4'>
      {/* Header Description */}
      <div className='flex flex-col gap-2 mb-2'>
        <Text size='sm' dim>
          Create a new public key, carefully check all the information before proceeding.
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
        {/* Info for seed phrase wallets */}
        {isSeedPhraseWallet && (
          <div className='flex flex-col gap-1 mt-1'>
            <Text size='sm' weight='medium'>
              Seed Phrase Wallet
            </Text>
            <Text size='sm' dim>
              The key will be derived from your seed phrase using the proper derivation path.
            </Text>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className='flex-1 space-y-6'>
        <SelectField
          label='Type'
          options={KEY_TYPES}
          selectedValue={keyType}
          onSelect={setKeyType}
        />

        <SelectField
          label='Purpose'
          options={PURPOSES}
          selectedValue={purpose}
          onSelect={setPurpose}
        />

        <SelectField
          label='Security Level'
          options={SECURITY_LEVELS}
          selectedValue={securityLevel}
          onSelect={setSecurityLevel}
        />

        <SelectField
          label='Read Only'
          options={READ_ONLY_OPTIONS}
          selectedValue={readOnly}
          onSelect={setReadOnly}
        />
      </div>

      {/* Error Display */}
      {error != null && (
        <ValueCard colorScheme='yellow' className='break-words whitespace-pre-wrap'>
          <Text color='red'>Failed to create key: {error}</Text>
        </ValueCard>
      )}

      {/* Info Tooltip */}
      <InfoCard
        className='flex flex-row items-center gap-3'
        borderColor='black'
        backgroundColor='light'
      >
        <InfoCircleIcon size={14} className='flex-shrink-0 text-dash-primary-dark-blue' />
        <Text size='sm' weight='medium' className='text-[0.75rem]'>
          Some information can&apos;t be changed after adding a key.
        </Text>
      </InfoCard>

      {/* Signing Key Selector */}
      <PublicKeySelect
        keys={signingKeys}
        value={selectedSigningKey}
        onChange={setSelectedSigningKey}
        loading={signingKeysLoading}
        error={signingKeysError}
        keyRequirements={[
          {
            purpose: 'AUTHENTICATION',
            securityLevel: 'MASTER'
          }
        ]}
      />

      {/* Password field */}
      <div className='flex flex-col gap-3'>
        <Text size='sm' dim>
          Password *
        </Text>
        <Input
          type='password'
          placeholder='Enter your wallet password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='w-full'
        />
      </div>

      {/* Create Button */}
      <div className='mt-auto pb-4'>
        <Button
          colorScheme='brand'
          variant='outline'
          disabled={isCreating || currentIdentity == null || password.trim() === '' || selectedSigningKey == null}
          className='w-full'
          onClick={() => {
            handleCreateKey().catch(e => console.error('Create key error:', e))
          }}
        >
          {isCreating ? 'Creating Key...' : 'Create New Key'}
        </Button>
      </div>
    </div>
  )
}
