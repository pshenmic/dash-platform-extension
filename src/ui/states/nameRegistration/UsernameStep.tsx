import React from 'react'
import { Button } from 'dash-ui-kit/react'

interface UsernameStepProps {
  isValid: boolean
  isAvailable: boolean
  isCheckingAvailability: boolean
  hasSufficientBalance: boolean
  isCheckingBalance: boolean
  hasCompatibleKeys: boolean
  onRequestUsername: () => void
}

export const UsernameStep: React.FC<UsernameStepProps> = ({
  isValid,
  isAvailable,
  isCheckingAvailability,
  hasSufficientBalance,
  isCheckingBalance,
  hasCompatibleKeys,
  onRequestUsername
}) => {
  return (
    <>
      <Button
        colorScheme='brand'
        size='md'
        onClick={onRequestUsername}
        disabled={!isValid || !isAvailable || !hasSufficientBalance || !hasCompatibleKeys || isCheckingAvailability || isCheckingBalance}
        className='w-full'
      >
        {isCheckingBalance
          ? 'Checking balance...'
          : isCheckingAvailability
            ? 'Checking availability...'
            : 'Request Username'}
      </Button>
    </>
  )
}
