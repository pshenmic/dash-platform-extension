import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { base64 } from '@scure/base'
import { Text, Button, ValueCard, Identifier, Input, InfoCircleIcon } from 'dash-ui-kit/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { WalletType } from '../../../../types'
import { useExtensionAPI, useSdk } from '../../../hooks'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { hexToBytes } from '../../../../utils'
import { InfoCard } from '../../common'

export const createKeyScreenConfig: ScreenConfig = {
  id: 'create-key-settings',
  title: 'Create Public Key',
  category: 'wallet',
  content: []
}

// Key type options matching Dash Platform SDK
const KEY_TYPES = [
  { id: 'ECDSA_SECP256K1', label: 'ECDSA_SECP256K1', value: 0 },
  { id: 'BLS12_381', label: 'BLS_12-381', value: 1 },
  { id: 'ECDSA_HASH160', label: 'ECDSA_SECP256K1_HASH160', value: 2 },
  { id: 'BIP13_SCRIPT_HASH', label: 'BIP13', value: 3 },
  { id: 'EDDSA_25519_HASH160', label: 'EDDSA_25519_HASH160', value: 4 }
]

// Purpose options
const PURPOSES = [
  { id: 'AUTHENTICATION', label: 'Authentication', value: 0 },
  { id: 'ENCRYPTION', label: 'Encryption', value: 1 },
  { id: 'DECRYPTION', label: 'Decryption', value: 2 },
  { id: 'TRANSFER', label: 'Transfer', value: 3 }
]

// Security level options
const SECURITY_LEVELS = [
  { id: 'MASTER', label: 'Master', value: 0 },
  { id: 'CRITICAL', label: 'Critical', value: 1 },
  { id: 'HIGH', label: 'High', value: 2 },
  { id: 'MEDIUM', label: 'Medium', value: 3 }
]

// Read only options
const READ_ONLY_OPTIONS = [
  { id: 'false', label: 'False', value: false },
  { id: 'true', label: 'True', value: true }
]

interface SelectFieldProps {
  label: string
  options: Array<{ id: string, label: string, value: any }>
  selectedValue: any
  onSelect: (value: any) => void
}

const SelectField: React.FC<SelectFieldProps> = ({ label, options, selectedValue, onSelect }) => {
  return (
    <div className='flex flex-col gap-3'>
      <Text size='sm' dim>
        {label}
      </Text>
      <div className='flex flex-wrap gap-2'>
        {options.map((option) => {
          const isSelected = selectedValue === option.value
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.value)}
              className={`
                px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors
                ${isSelected
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const CreateKeyScreen: React.FC<SettingsScreenProps> = ({
  currentIdentity,
  currentWallet,
  onBack,
  onClose
}) => {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  
  const [keyType, setKeyType] = useState<number>(0)
  const [purpose, setPurpose] = useState<number>(0)
  const [securityLevel, setSecurityLevel] = useState<number>(2)
  const [readOnly, setReadOnly] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    // For seed phrase wallets, password is required
    if (currentWallet.type === WalletType.seedphrase && password.trim() === '') {
      setError('Password is required for seed phrase wallets')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      console.log('Creating key with parameters:', {
        identity: currentIdentity,
        keyType,
        purpose,
        securityLevel,
        readOnly,
        network: currentWallet.network,
        walletType: currentWallet.type
      })

      // Step 1: Generate/derive private key using the handler
      // This will either derive from seed phrase (with password) or generate random (keystore)
      const { privateKey: privateKeyHex, walletType } = await extensionAPI.createIdentityKey(
        currentIdentity,
        password
      )

      console.log('Private key created for wallet type:', walletType)

      // Step 2: Get the public key data
      const privateKeyWASM = PrivateKeyWASM.fromHex(privateKeyHex, currentWallet.network)
      const publicKeyBytes = privateKeyWASM.getPublicKey().bytes() // 33 bytes compressed
      const publicKeyHashHex = privateKeyWASM.getPublicKeyHash() // 20 bytes hash as hex string
      const publicKeyHashBytes = hexToBytes(publicKeyHashHex) // Convert to Uint8Array

      // Step 3: Get identity data from network
      const identity = await sdk.identities.getIdentityByIdentifier(currentIdentity)
      const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)
      
      // Get next revision
      const currentRevision = BigInt(identity.revision)
      const nextRevision = currentRevision + BigInt(1)

      // Get current keys to determine next key ID
      const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)
      const maxKeyId = identityPublicKeys.reduce((max: number, key: any) => 
        Math.max(max, key.keyId ?? 0), -1)
      const nextKeyId = maxKeyId + 1

      console.log('Next key ID will be:', nextKeyId)
      console.log('Public key bytes (33):', Array.from(publicKeyBytes))
      console.log('Public key hash bytes (20):', Array.from(publicKeyHashBytes))

      // Step 4: Create public key structure for adding
      // Use public key hash (20 bytes) as data
      const publicKeyToAdd = {
        id: nextKeyId,
        keyType,       // 0 for ECDSA_SECP256K1
        purpose,       // 0 for AUTHENTICATION
        securityLevel, // 2 for HIGH
        data: publicKeyHashBytes, // 20 bytes public key hash
        readOnly
      }

      console.log('Public key to add:', {
        ...publicKeyToAdd,
        data: Array.from(publicKeyHashBytes)
      })

      // Step 5: Create state transition
      const stateTransition = sdk.identities.createStateTransition('update', {
        identityId: currentIdentity,
        disablePublicKeyIds: [],
        addPublicKeys: [publicKeyToAdd],
        identityNonce: identityNonce + 1n,
        revision: nextRevision
      })

      console.log('State transition created:', stateTransition)
      console.log('State transition type:', typeof stateTransition)
      console.log('State transition addPublicKeys:', (stateTransition as any).addPublicKeys)

      // Step 6: Serialize state transition to base64
      const stateTransitionBytes = stateTransition.bytes()
      const stateTransitionBase64 = base64.encode(stateTransitionBytes)

      // Step 7: Save state transition to storage
      // Note: For keystore wallets, the private key should be saved/imported manually
      // For seedphrase wallets, keys are derived automatically when needed
      const response = await extensionAPI.createStateTransition(stateTransitionBase64)

      console.log('State transition saved:', response.stateTransition)
      
      // For keystore wallets, log the private key for manual import
      if (currentWallet.type === WalletType.keystore) {
        console.warn('⚠️ IMPORTANT: Save this private key for manual import after transaction confirmation:')
        console.warn('Private Key:', privateKeyHex)
      }

      // Step 8: Close settings menu
      if (onClose != null) {
        onClose()
      }

      // Step 9: Navigate to approval page
      navigate(`/approve/${response.stateTransition.hash}`, {
        state: {
          returnToHome: true
        }
      })
    } catch (e) {
      console.error('Failed to create key:', e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(`Failed to create key: ${errorMessage}`)
    } finally {
      setIsCreating(false)
    }
  }


  const isSeedPhraseWallet = currentWallet?.type === WalletType.seedphrase

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
              The key will be derived from your seed phrase using the proper derivation path. You'll need to enter your password to unlock the seed phrase.
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
          <Text color='red'>{error}</Text>
        </ValueCard>
      )}

      {/* Info Tooltip */}
      <InfoCard
        className='flex flex-row items-center gap-3'
        borderColor='black'
        backgroundColor='light'
      >
        <InfoCircleIcon size={14} className='flex-shrink-0 text-dash-primary-dark-blue'/>
        <Text size='sm' weight='medium' className='text-[0.75rem]'>
          Some information can&apos;t be changed after adding a key.
        </Text>
      </InfoCard>

      <div className='flex flex-col gap-2'>
        {/* Password field for seed phrase wallets */}
        {isSeedPhraseWallet && (
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
        )}
      </div>

      {/* Create Button */}
      <div className='mt-auto pb-4'>
        <Button
          colorScheme='brand'
          variant='outline'
          disabled={isCreating || currentIdentity == null || (isSeedPhraseWallet && password.trim() === '')}
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
