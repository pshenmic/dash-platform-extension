import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PasswordField } from '../../components/forms'

function LoginState (): React.JSX.Element {
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
      <TitleBlock
        title='Welcome Back'
        description='Use the password to unlock your wallet.'
        centered
      />

      <div className='flex flex-col gap-4'>
        <PasswordField
          value={password}
          onChange={setPassword}
          error={error}
          className='w-full'
        />

        <Button
          size='xl'
          colorScheme='brand'
          onClick={() => {
            handleLogin().catch(e => console.log('handleLogin error: ', e))
          }}
          disabled={password === '' || isLoading}
          className='w-full'
        >
          {isLoading ? 'Logging in...' : 'Unlock'}
        </Button>
      </div>
    </div>
  )
}

export default withAccessControl(LoginState, {
  requireWallet: false
})
