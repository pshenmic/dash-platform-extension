import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { Button, Text, Input } from 'dash-ui/react'

export default function SetupPasswordState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSetupPassword = async (): Promise<void> => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await extensionAPI.setupPassword(password)
      void navigate('/login')
    } catch (err) {
      setError((err as Error).toString())
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupClick = (): void => {
    void handleSetupPassword()
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='xl' weight='bold'>
        Setup Password
      </Text>

      <Text color='blue'>
        Create a password to secure your wallet
      </Text>

      <div className='flex flex-col gap-2'>
        <Input
          type='password'
          placeholder='Enter password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size='xl'
          colorScheme='default'
        />

        <Input
          type='password'
          placeholder='Confirm password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          size='xl'
          colorScheme='default'
        />
      </div>

      {error != null && (
        <div className='text-red-500 text-sm'>
          {error}
        </div>
      )}

      <Button
        colorScheme='brand'
        onClick={handleSetupClick}
        disabled={password === '' || confirmPassword === '' || isLoading}
        className='w-full'
      >
        {isLoading ? 'Setting up...' : 'Setup Password'}
      </Button>
    </div>
  )
}
