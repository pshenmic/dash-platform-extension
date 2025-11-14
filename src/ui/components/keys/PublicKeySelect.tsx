import React, { useEffect } from 'react'
import { Text, ValueCard, Select, KeyIcon } from 'dash-ui-kit/react'
import { getPurposeLabel, getSecurityLabel } from '../../../enums'
import { isKeyCompatible } from '../../../utils'
import { MissingRequiredKeyWarning } from './MissingRequiredKeyWarning'

export interface PublicKeyInfo {
  keyId: number
  purpose: string
  securityLevel: string
  hash: string
  disabledAt?: number | null
}

export interface KeyRequirement {
  purpose: string
  securityLevel: string
}

interface PublicKeySelectProps {
  keys: PublicKeyInfo[]
  value: string | null
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
  // Auto-select first compatible key when keys or requirements change
  useEffect(() => {
    if (keys.length > 0) {
      const compatibleKeys = keys.filter(key =>
        isKeyCompatible(key, keyRequirements) && key.disabledAt == null
      )

      if (compatibleKeys.length > 0) {
        const currentKey = keys.find(key => key.keyId.toString() === value)

        const isCurrentKeyCompatible = (currentKey != null)
          ? isKeyCompatible(currentKey, keyRequirements) && currentKey.disabledAt == null
          : false

        // Select first compatible key if no key selected or current key is not compatible
        if (value === '' || value == null || !isCurrentKeyCompatible) {
          const firstCompatibleKey = compatibleKeys[0]
          onChange(firstCompatibleKey.keyId.toString())
        }
      }
    }
  }, [keys, keyRequirements, value, onChange])

  const signingKeyOptions = keys.map((key) => {
    const keyValue = key.keyId.toString()
    const purposeLabel = getPurposeLabel(key.purpose)
    const securityLabel = getSecurityLabel(key.securityLevel)
    const isDisabled = key.disabledAt != null

    // Check if key is compatible with requirements or disabled
    const isKeyDisabled = !isKeyCompatible(key, keyRequirements) || isDisabled

    return {
      value: keyValue,
      label: `Key: ${keyValue}`,
      disabled: isKeyDisabled,
      content: (
        <div className={`flex items-center flex-wrap gap-2 w-full ${isKeyDisabled ? 'opacity-50' : ''}`}>
          <div className={`flex items-center justify-center w-5 h-5 rounded-full ${
            isKeyDisabled ? 'bg-gray-200' : 'bg-gray-100'
          }`}
          >
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

            {isDisabled && (
              <Text size='sm' dim>disabled</Text>
            )}
          </div>
        </div>
      )
    }
  })

  // Check if there are any compatible keys
  const compatibleKeys = keys.filter(key => isKeyCompatible(key, keyRequirements))
  const hasCompatibleKeys = compatibleKeys.length > 0

  return (
    <div className='flex flex-col gap-2.5'>
      <Text size='md' opacity='50'>Choose Signing Key</Text>
      {loading
        ? (
          <ValueCard colorScheme='lightGray' size='xl' className='h-[3.75rem] flex items-center'>
            <Text size='md' opacity='50'>Loading signing keys...</Text>
          </ValueCard>
          )
        : (error != null && error !== '')
            ? (
              <ValueCard colorScheme='red' size='xl' className='h-[3.75rem] flex items-center'>
                <Text size='md' color='red'>Error loading signing keys: {error}</Text>
              </ValueCard>
              )
            : signingKeyOptions.length > 0
              ? (
                <>
                  <Select
                    value={value ?? undefined}
                    onChange={onChange}
                    options={signingKeyOptions}
                    showArrow
                    size='xl'
                    disabled={disabled}
                    className='py-[0.875rem] h-[3.75rem]'
                  />
                  {!hasCompatibleKeys && keyRequirements.length > 0 && (
                    <MissingRequiredKeyWarning keyRequirements={keyRequirements} />
                  )}
                </>
                )
              : (
                <ValueCard colorScheme='lightGray' size='xl' className='h-[3.75rem] flex items-center'>
                  <Text size='md' opacity='50'>No signing keys available</Text>
                </ValueCard>
                )}
    </div>
  )
}
