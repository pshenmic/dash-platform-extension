import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Text from '../../text/Text'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function StartState() {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await extensionAPI.getStatus()

        if (!status.passwordSet) {
          // Password not set - go to password setup
          navigate('/setup-password')
        } else if (!status.currentWalletId) {
          // Password set but wallet not created - go to login
          navigate('/login')
        } else {
          // Everything is set up - go to main screen
          navigate('/home')
        }
      } catch (err) {
        setError('Failed to check status: ' + err.toString())
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [navigate, extensionAPI])

  return !error
    ? <div className={'flex flex-col gap-4 items-center justify-center min-h-[200px]'}>
        <Text size={'xl'} weight={'bold'}>
          Dash Platform Extension
        </Text>

        {isLoading && (
          <Text color={'blue'}>
            Loading...
          </Text>
        )}
      </div>
    : <div className={'flex flex-col gap-4 items-center justify-center min-h-[200px]'}>
        <Text size={'lg'} color={'red'}>
          Error
        </Text>
        <Text size={'sm'} color={'red'}>
          {error}
        </Text>
      </div>
}
