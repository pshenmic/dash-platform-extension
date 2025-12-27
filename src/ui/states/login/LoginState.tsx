import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Text, Input } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'

function LoginState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  const goToPassword = () => {
    passwordRef.current?.focus()
    passwordRef.current?.select()
  }

  const handleLogin = async (): Promise<void> => {
    if (password === '') {
      setError('Password is required')
      goToPassword()
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
        goToPassword()
      }
    } catch (err) {
      setError('Login failed')
      goToPassword()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      className='flex flex-col'
      onSubmit={(e) => {
        e.preventDefault()
        handleLogin().catch(e => console.log('handleLogin error: ', e))
      }}
    >
      <TitleBlock
        title='Welcome Back'
        description='Use the password to unlock your wallet.'
        centered
      />

      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2 w-full'>
          <Text dim>
            Password
          </Text>
          <Input
            ref={passwordRef}
            type='password'
            placeholder='Enter password'
            autoFocus
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
          type='submit'
          size='xl'
          colorScheme='brand'
          disabled={password === '' || isLoading}
          className='w-full'
        >
          {isLoading ? 'Logging in...' : 'Unlock'}
        </Button>
      </div>
    </form>
  )
}

export default withAccessControl(LoginState, {
  requireWallet: false
})
