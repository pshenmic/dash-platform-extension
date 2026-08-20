import React, { useState } from 'react'
import { Text, Button } from 'dash-ui-kit/react'
import { PasswordField } from './PasswordField'

interface PasswordGateProps {
  description?: string
  submitLabel?: string
  pendingLabel?: string
  isPending?: boolean
  onSubmit: (password: string) => Promise<string | null>
  onCancel?: () => void
}

export const PasswordGate: React.FC<PasswordGateProps> = ({
  description,
  submitLabel = 'Confirm',
  pendingLabel = 'Loading...',
  isPending = false,
  onSubmit,
  onCancel
}) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (password === '') {
      setError('Password must be provided')
      return
    }

    setError(null)
    const submitError = await onSubmit(password)

    if (submitError != null) {
      setError(submitError)
      return
    }

    setPassword('')
  }

  return (
    <div className='flex flex-col gap-3'>
      {description != null && (
        <Text size='sm' dim>{description}</Text>
      )}
      <PasswordField
        value={password}
        onChange={(value) => { setPassword(value); setError(null) }}
        error={error}
        autoFocus
      />
      <div className='flex gap-2'>
        <Button
          colorScheme='brand'
          className='flex-1'
          onClick={() => { void handleSubmit() }}
          disabled={isPending}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {onCancel != null && (
          <Button
            colorScheme='lightGray'
            className='flex-1'
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
