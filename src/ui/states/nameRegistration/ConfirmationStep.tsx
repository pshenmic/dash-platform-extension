import React from 'react'
import { Button, ValueCard, Text, DashLogo, Input } from 'dash-ui-kit/react'
import { PublicKeySelect, PublicKeyInfo, KeyRequirement } from '../../components/keys'

interface ConfirmationStepProps {
  // Rate data
  rateData: number | null

  // Authentication
  password: string
  passwordError: string | null
  selectedSigningKey: string | null
  signingKeys: PublicKeyInfo[]
  signingKeysLoading: boolean
  signingKeysError: string | null
  keyRequirements?: KeyRequirement[]

  // Form state
  isRegistering: boolean
  registrationError: string | null

  // Actions
  onCancel: () => void
  onConfirm: () => void
  onPasswordChange: (value: string) => void
  onSigningKeyChange: (keyId: string) => void
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  rateData,
  password,
  passwordError,
  selectedSigningKey,
  signingKeys,
  signingKeysLoading,
  signingKeysError,
  keyRequirements,
  isRegistering,
  registrationError,
  onCancel,
  onConfirm,
  onPasswordChange,
  onSigningKeyChange
}) => {
  return (
    <>
      <ValueCard border={false} colorScheme='lightGray' className='flex justify-between items-center'>
        <Text size='md' weight='medium' color='muted' className='text-dash-primary-dark-blue/75'>
          Payment amount:
        </Text>
        <div className='flex flex-col items-end gap-1'>
          <div className='flex items-center gap-1 !text-dash-primary-dark-blue'>
            0.25 <DashLogo size={10} className='!text-dash-primary-dark-blue' />
          </div>
          <div className='bg-brand/5 px-1 py-0.5 flex items-center rounded'>
            <Text size='xs' className='!text-dash-brand'>
              ~ ${(0.25 * (rateData ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </div>
        </div>
      </ValueCard>

      {/* Choose Signing Key */}
      <PublicKeySelect
        keys={signingKeys}
        value={selectedSigningKey}
        onChange={onSigningKeyChange}
        loading={signingKeysLoading}
        error={signingKeysError}
        disabled={isRegistering}
        keyRequirements={keyRequirements}
      />

      {/* Password */}
      <div className='flex flex-col gap-2.5'>
        <Text size='md' opacity='50'>Password</Text>
        <Input
          type='password'
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder='Your Password'
          size='xl'
          variant='outlined'
          error={passwordError != null}
          disabled={isRegistering}
        />
        {passwordError != null && (
          <Text size='sm' color='red' className='mt-1'>
            {passwordError}
          </Text>
        )}
      </div>

      {(registrationError != null && registrationError !== '') && (
        <ValueCard
          border={false}
          colorScheme='yellow'
          className='break-all'
        >
          {registrationError}
        </ValueCard>
      )}

      <div className='flex gap-[0.675rem]'>
        <Button
          variant='outline'
          colorScheme='brand'
          size='md'
          onClick={onCancel}
          disabled={isRegistering}
          className='flex-1'
        >
          Cancel
        </Button>
        <Button
          colorScheme='brand'
          size='md'
          onClick={onConfirm}
          disabled={isRegistering || password === '' || selectedSigningKey === null}
          className='flex-1'
        >
          {isRegistering ? 'Registering...' : 'Confirm'}
        </Button>
      </div>
    </>
  )
}
