import React from 'react'
import { Text, ValueCard, Select, KeyIcon } from 'dash-ui-kit/react'
import { getPurposeLabel, getSecurityLabel } from '../../../enums'

export interface PublicKeyInfo {
  keyId: number | null
  purpose: string
  securityLevel: string
  hash: string
}

export interface KeyRequirement {
  purpose: string
  securityLevel: string
}

interface PublicKeySelectProps {
  keys: PublicKeyInfo[]
  value: string
  onChange: (keyId: string) => void
  disabled?: boolean
  loading?: boolean
  error?: string | null
  keyRequirements?: KeyRequirement[]
}

export function PublicKeySelect ({
  keys,
  value,
  onChange,
  disabled = false,
  loading = false,
  error = null,
  keyRequirements = []
}: PublicKeySelectProps): React.JSX.Element {
  // Function to check if a key is compatible with transaction requirements
  const isKeyCompatible = (key: PublicKeyInfo): boolean => {
    if (keyRequirements.length === 0) {
      return false // No requirements means no keys are compatible
    }

    // Exact string comparison for purpose and security level
    const keyPurpose = String(key.purpose)
    const keySecurityLevel = String(key.securityLevel)
    
    return keyRequirements.some(req => 
      req.purpose === keyPurpose && req.securityLevel === keySecurityLevel
    )
  }

  const signingKeyOptions = keys.map((key, index) => {
    const keyValue = key.keyId?.toString() ?? (key.hash !== '' ? key.hash : `key-${index}`)
    const purposeLabel = getPurposeLabel(key.purpose)
    const securityLabel = getSecurityLabel(key.securityLevel)

    // Check if key is compatible with requirements
    const isKeyDisabled = !isKeyCompatible(key)

    return {
      value: keyValue,
      disabled: isKeyDisabled,
      content: (
        <div className={`flex items-center flex-wrap gap-2 w-full ${isKeyDisabled ? 'opacity-50' : ''}`}>
          <div className={`flex items-center justify-center w-5 h-5 rounded-full ${
            isKeyDisabled ? 'bg-gray-200' : 'bg-gray-100'
          }`}>
            <KeyIcon size={10} className={isKeyDisabled ? 'text-gray-500' : 'text-gray-700'} />
          </div>

          <Text size='sm' weight='medium' className={isKeyDisabled ? 'text-gray-500' : 'text-gray-900'}>
            Key ID: {key.keyId}
          </Text>

          <div className='flex items-center gap-2'>
            <ValueCard
              colorScheme={isKeyDisabled ? 'gray' : 'lightGray'}
              size='sm'
              className='p-2'
            >
              <Text size='sm' weight='medium'>
                {securityLabel}
              </Text>
            </ValueCard>

            <ValueCard
              colorScheme={isKeyDisabled ? 'gray' : 'lightGray'}
              size='sm'
              className='p-2'
            >
              <Text size='sm' weight='medium'>
                {purposeLabel}
              </Text>
            </ValueCard>
          </div>
        </div>
      )
    }
  })

  return (
    <div className='flex flex-col gap-2.5'>
      <Text size='md' opacity='50'>Choose Signing Key</Text>
      {loading
        ? (
          <ValueCard colorScheme='lightGray' size='xl'>
            <Text size='md' opacity='50'>Loading signing keys...</Text>
          </ValueCard>
          )
        : (error != null && error !== '')
            ? (
              <ValueCard colorScheme='red' size='xl'>
                <Text size='md' color='red'>Error loading signing keys: {error}</Text>
              </ValueCard>
              )
            : signingKeyOptions.length > 0
              ? (
                <Select
                  value={value}
                  onChange={onChange}
                  options={signingKeyOptions}
                  showArrow
                  size='xl'
                  disabled={disabled}
                  className='py-[0.875rem]'
                />
                )
              : (
                <ValueCard colorScheme='lightGray' size='xl'>
                  <Text size='md' opacity='50'>No signing keys available</Text>
                </ValueCard>
                )}
    </div>
  )
}
