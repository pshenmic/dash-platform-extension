import React from 'react'
import { Button, ValueCard } from 'dash-ui-kit/react'

interface UsernameStepProps {
  username: string
  isContested: boolean
  isValid: boolean
  onRequestUsername: () => void
}

export const UsernameStep: React.FC<UsernameStepProps> = ({
  username,
  isContested,
  isValid,
  onRequestUsername
}) => {
  return (
    <>
      {username.length > 0 && (isContested || !isValid) && (
        <ValueCard
          border={false}
          className='!text-[0.75rem] dash-shadow-xl text-dash-primary-dark-blue/75'
        >
          {!isValid
            ? 'Username must be at least 3 characters and contain only letters, numbers, hyphens, and underscores'
            : 'This username falls under the rules of a contested username. Masternodes will vote for your username approval'}
        </ValueCard>
      )}
      <Button
        colorScheme='brand'
        size='md'
        onClick={onRequestUsername}
        disabled={!isValid}
        className='w-full'
      >
        Request Username
      </Button>
    </>
  )
}
