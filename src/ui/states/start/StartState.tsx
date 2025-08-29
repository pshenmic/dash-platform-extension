import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function StartState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()

        if (!status.passwordSet) {
          // Password not set - go to password setup
          navigate('/setup-password')
        } else if (status.currentWalletId == null || status.currentWalletId === '') {
          // Password set but wallet not created - go to login
          navigate('/login')
        } else {
          // Everything is set up - go to main screen
          navigate('/home')
        }
      } catch (err) {
        setError('Failed to check status: ' + String(err))
        console.warn(err)
      } finally {
        setIsLoading(false)
      }
    }

    void checkStatus()
  }, [navigate, extensionAPI])

  return error == null
    ? (
      <div className='flex flex-col gap-4 items-center justify-center min-h-[200px]'>
        <Text size='xl' weight='bold'>
          Dash Platform Extension
        </Text>

        {isLoading && (
          <Text color='blue'>
            Loading...
          </Text>
        )}
      </div>
      )
    : (
      <div className='flex flex-col gap-4 items-center justify-center min-h-[200px]'>
        <Text size='lg' color='red'>
          Error
        </Text>
        <Text size='sm' color='red'>
          {error}
        </Text>
      </div>
      )
}
