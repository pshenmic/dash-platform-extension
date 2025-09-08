import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Text, Input, Heading, DashLogo } from 'dash-ui-kit/react'
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
        const status = await extensionAPI.getStatus()

        if (status.currentWalletId != null) {
          void navigate('/home')
        } else {
          void navigate('/no-wallet')
        }
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
    <div className='flex flex-col'>
      <div className='flex items-center flex-col w-full gap-2.5 mb-6'>
        <DashLogo containerSize='3rem' />

        <Heading level={1} size='2xl'>
          Welcome Back
        </Heading>

        <Text dim className='leading-tight' size='sm'>
          Use the password to unlock your wallet.
        </Text>
      </div>

      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2 w-full'>
          <Text dim>
            Password
          </Text>
          <Input
            type='password'
            placeholder='Enter password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size='xl'
            colorScheme='default'
            className='w-full'
          />
        </div>

        {error != null && (
          <div className='text-red-500 text-sm'>
            {error}
          </div>
        )}

        <Button
          size='xl'
          colorScheme='brand'
          onClick={async () => await handleLogin().catch(e => console.log('handleLogin error: ', e))}
          disabled={password === '' || isLoading}
          className='w-full'
        >
          {isLoading ? 'Logging in...' : 'Unlock'}
        </Button>
      </div>
    </div>
  )
}
