import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'dash-ui/react'
import { Text } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function LoginState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (): Promise<void> => {
    if (password === '') {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await extensionAPI.checkPassword(password)
      if (result.success) {
        void navigate('/create-wallet')
      } else {
        setError('Invalid password')
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginClick = (): void => {
    void handleLogin()
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      void handleLogin()
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='xl' weight='bold'>
        Enter Password
      </Text>

      <Text color='blue'>
        Enter your password to unlock the wallet
      </Text>

      <div className='flex flex-col gap-2'>
        <input
          type='password'
          placeholder='Enter password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          className='p-3 border rounded'
          autoFocus
        />
      </div>

      {error != null && (
        <div className='text-red-500 text-sm'>
          {error}
        </div>
      )}

      <Button
        colorScheme='brand'
        onClick={handleLoginClick}
        disabled={password === '' || isLoading}
        className='w-full'
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </div>
  )
}
