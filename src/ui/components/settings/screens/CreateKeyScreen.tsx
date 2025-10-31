import React, { useState, useEffect } from 'react'
import { Text, Button, ValueCard, Identifier } from 'dash-ui-kit/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { WalletType } from '../../../../types'

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
  onBack
}) => {
  const [keyType, setKeyType] = useState<number>(0)
  const [purpose, setPurpose] = useState<number>(0)
  const [securityLevel, setSecurityLevel] = useState<number>(2)
  const [readOnly, setReadOnly] = useState<boolean>(false)
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

    if (currentWallet?.type !== WalletType.seedphrase) {
      setError('Key creation is only available for seed phrase wallets')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      // TODO: Implement key creation via state transition
      // This will require creating an IdentityUpdate state transition
      // with the new public key
      console.log('Creating key with parameters:', {
        identity: currentIdentity,
        keyType,
        purpose,
        securityLevel,
        readOnly
      })

      // Placeholder error for now
      throw new Error('Key creation is not yet implemented. This feature requires creating an Identity Update state transition on the Dash Platform.')
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const isSeedPhraseWallet = currentWallet?.type === WalletType.seedphrase

  if (!isSeedPhraseWallet) {
    return (
      <div className='flex flex-col h-full px-4'>
        <div className='mb-6'>
          <Text size='sm' dim>
            Key creation is only available for seed phrase wallets.
          </Text>
        </div>

        <ValueCard colorScheme='yellow' size='xl'>
          <Text size='md' color='red'>
            This feature is only available for wallets created with a seed phrase. Keystore wallets can only import existing private keys.
          </Text>
        </ValueCard>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header Description */}
      <div className='px-4 mb-6'>
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
      </div>

      {/* Form Fields */}
      <div className='flex-1 px-4 space-y-6 overflow-y-auto'>
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
        <div className='px-4 mb-4'>
          <ValueCard colorScheme='yellow' className='break-words whitespace-pre-wrap'>
            <Text color='red'>{error}</Text>
          </ValueCard>
        </div>
      )}

      {/* Info Tooltip */}
      <div className='px-4 mb-4'>
        <ValueCard
          colorScheme='white'
          className='flex-row items-start gap-3 border-l-2 border-blue-600'
        >
          <div className='flex-shrink-0 w-3.5 h-3.5 mt-0.5'>
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M7 0.333374C3.32 0.333374 0.333344 3.32004 0.333344 7.00004C0.333344 10.68 3.32 13.6667 7 13.6667C10.68 13.6667 13.6667 10.68 13.6667 7.00004C13.6667 3.32004 10.68 0.333374 7 0.333374ZM7.66668 10.3334H6.33334V6.33337H7.66668V10.3334ZM7.66668 5.00004H6.33334V3.66671H7.66668V5.00004Z'
                fill='currentColor'
              />
            </svg>
          </div>
          <div className='flex-1'>
            <Text size='xs' weight='medium'>
              Some information can&apos;t be changed after adding a key.
            </Text>
          </div>
        </ValueCard>
      </div>

      {/* Create Button */}
      <div className='p-4 mt-auto'>
        <Button
          colorScheme='brand'
          variant='outline'
          disabled={isCreating || currentIdentity == null}
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
