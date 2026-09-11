import React, { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PasswordField } from '../../components/forms'
import { unlockSession } from '../../utils/lockSession'

function LoginState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  const goToPassword = (): void => {
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
        await unlockSession()

        const status = await extensionAPI.getStatus()

        // Wallets created before the xpubs were cached have no other chance to
        // catch up: deriving needs the seed, and the password is only in hand
        // here. Covers the current wallet only, which is all the handler does.
        // Idempotent, and a failure must not keep the user locked out.
        if (status.currentWalletId != null) {
          await extensionAPI.initAccountXpubs(password)
            .catch(e => console.log('initAccountXpubs error: ', e))
        }

        const returnTo = searchParams.get('returnTo')

        if (!status.hasAnyWallet) {
          void navigate('/welcome')
        } else if (returnTo != null && returnTo !== '') {
          void navigate(returnTo)
        } else {
          void navigate('/home')
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
        <PasswordField
          ref={passwordRef}
          value={password}
          onChange={setPassword}
          error={error}
          autoFocus
          className='w-full'
        />

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
  requireWallet: false,
  allowLocked: true
})
