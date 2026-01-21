import React, { useState, useEffect, useRef } from 'react'
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
  const passwordRef = useRef<HTMLInputElement>(null)

  const goToPassword = () => {
      passwordRef.current?.focus()
      passwordRef.current?.select()
  }

  const handleSetupPassword = async (): Promise<void> => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      goToPassword()
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      goToPassword()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await extensionAPI.setupPassword(password)
      void navigate('/login')
    } catch (err) {
      setError((err as Error).toString())
      goToPassword()
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
    <form
      className='flex flex-col gap-2.5 -mt-16'
      onSubmit={(e) => {
        e.preventDefault()
        handleSetupPassword()
          .catch(e => console.log('handleSetupPassword error: ', e))
      }}
    >
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
        type='submit'
        colorScheme='brand'
        size='xl'
        disabled={password === '' || confirmPassword === '' || password.length !== confirmPassword.length || isLoading}
        className='w-full'
      >
        {isLoading ? 'Setting up...' : 'Setup Password'}
      </Button>
    </form>
  )
}
