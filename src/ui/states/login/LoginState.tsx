import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/controls/buttons'
import Text from '../../text/Text'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function LoginState () {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await extensionAPI.checkPassword(password)
      if (result.success) {
        navigate('/create-wallet')
      } else {
        setError('Invalid password')
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setIsLoading(false)
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
          onKeyPress={async (e) => await (e.key === 'Enter' && handleLogin())}
          className='p-3 border rounded'
          autoFocus
        />
      </div>

      {error && (
        <div className='text-red-500 text-sm'>
          {error}
        </div>
      )}

      <Button
        colorScheme='brand'
        onClick={handleLogin}
        disabled={!password || isLoading}
        className='w-full'
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </div>
  )
}
