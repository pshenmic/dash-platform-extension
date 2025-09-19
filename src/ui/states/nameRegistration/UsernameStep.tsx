import React from 'react'
import { Button, ValueCard } from 'dash-ui-kit/react'

interface UsernameStepProps {
  username: string
  isContested: boolean
  isValid: boolean
  isAvailable: boolean
  isCheckingAvailability: boolean
  hasCompatibleKeys: boolean
  onRequestUsername: () => void
}

export const UsernameStep: React.FC<UsernameStepProps> = ({
  username,
  isContested,
  isValid,
  isAvailable,
  isCheckingAvailability,
  hasCompatibleKeys,
  onRequestUsername
}) => {
  return (
    <>
      {username.length > 0 && (isContested || !isValid || !isAvailable) && (
        <ValueCard
          border={false}
          className='!text-[0.75rem] dash-shadow-xl text-dash-primary-dark-blue/75'
        >
          {!isValid
            ? 'Username must be at least 3 characters and contain only letters, numbers, hyphens, and underscores'
            : !isAvailable
              ? 'This username is already taken. Please choose a different one.'
              : 'This username falls under the rules of a contested username. Masternodes will vote for your username approval'}
        </ValueCard>
      )}
      <Button
        colorScheme='brand'
        size='md'
        onClick={onRequestUsername}
        disabled={!isValid || !isAvailable || !hasCompatibleKeys || isCheckingAvailability}
        className='w-full'
      >
        {isCheckingAvailability ? 'Checking availability...' : 'Request Username'}
      </Button>
    </>
  )
}
