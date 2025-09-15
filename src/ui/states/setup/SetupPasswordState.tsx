import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks'
import { Button, Text, Input } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'

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

  useEffect(() => {
    const checkPassword = async (): Promise<void> => {
      const status = await extensionAPI.getStatus()
      const isPasswordSet = status.passwordSet
      if (isPasswordSet) {
        void navigate('/login')
      }
    }
    checkPassword()
      .catch(e => console.log('checkPassword error: ', e))
  }, [extensionAPI, navigate])

  return (
    <div className='flex flex-col gap-2.5 -mt-16'>
      <TitleBlock 
        title='Create Password'
        description='You will use this password to unlock your wallet. Do not share your password with others'
      />

      <div className='flex flex-col gap-2'>
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
        />

        <Text dim>
          Confirm Password
        </Text>
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
        size='xl'
        onClick={async () => await handleSetupPassword().catch(e => console.log('handleSetupPassword error: ', e))}
        disabled={password === '' || confirmPassword === '' || password.length !== confirmPassword.length || isLoading}
        className='w-full'
      >
        {isLoading ? 'Setting up...' : 'Setup Password'}
      </Button>
    </div>
  )
}
