import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks'
import { Button } from 'dash-ui-kit/react'
import { Banner } from '../../components/cards'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PasswordField } from '../../components/forms'

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
        containerClassName='!mb-4'
      />

      <div className='flex flex-col gap-2'>
        <PasswordField
          value={password}
          onChange={setPassword}
          label='Password'
          placeholder='Enter password'
        />

        <PasswordField
          value={confirmPassword}
          onChange={setConfirmPassword}
          label='Confirm Password'
          placeholder='Confirm password'
        />
      </div>

      <Banner variant='error' message={error} />

      <Button
        colorScheme='brand'
        size='xl'
        onClick={() => {
          handleSetupPassword()
            .catch(e => console.log('handleSetupPassword error: ', e))
        }}
        disabled={password === '' || confirmPassword === '' || password.length !== confirmPassword.length || isLoading}
        className='w-full'
      >
        {isLoading ? 'Setting up...' : 'Setup Password'}
      </Button>
    </div>
  )
}
