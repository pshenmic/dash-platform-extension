import React from 'react'
import { Text, ValueCard, Select, KeyIcon } from 'dash-ui-kit/react'
import { getPurposeLabel, getSecurityLabel } from '../../../enums'

export interface PublicKeyInfo {
  keyId: number | null
  purpose: string
  securityLevel: string
  hash: string
}

interface PublicKeySelectProps {
  keys: PublicKeyInfo[]
  value: string
  onChange: (keyId: string) => void
  disabled?: boolean
  loading?: boolean
  error?: string | null
}

export function PublicKeySelect ({
  keys,
  value,
  onChange,
  disabled = false,
  loading = false,
  error = null
}: PublicKeySelectProps): React.JSX.Element {
  const signingKeyOptions = keys.map((key, index) => {
    const keyValue = key.keyId?.toString() ?? (key.hash !== '' ? key.hash : `key-${index}`)
    const purposeLabel = getPurposeLabel(key.purpose)
    const securityLabel = getSecurityLabel(key.securityLevel)

    return {
      value: keyValue,
      label: `Key ${key.keyId ?? index}`,
      disabled: key.purpose !== 'AUTHENTICATION' || key.securityLevel !== 'HIGH',
      content: (
        <div className='flex items-center flex-wrap gap-2 w-full'>
          <div className='flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full'>
            <KeyIcon size={10} className='text-gray-700' />
          </div>

          <Text size='sm' weight='medium' className='text-gray-900'>
            Key ID: {key.keyId}
          </Text>

          <div className='flex items-center gap-2'>
            <ValueCard
              colorScheme='lightGray'
              size='sm'
              className='p-2'
            >
              <Text size='sm' weight='medium'>
                {securityLabel}
              </Text>
            </ValueCard>

            <ValueCard
              colorScheme='lightGray'
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
