import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/controls/buttons'
import { Text } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function CreateWalletState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateWallet = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { walletId } = await extensionAPI.createWallet('keystore')
      await extensionAPI.switchWallet(walletId, 'testnet')

      void navigate('/import')
    } catch (err) {
      setError((err as Error).toString())
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = (): void => {
    void handleCreateWallet()
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='xl' weight='bold'>
        Create Wallet
      </Text>

      <Text color='blue'>
        Create a new wallet to manage your identities and funds
      </Text>

      <div className='flex flex-col gap-3 p-4 bg-gray-50 rounded'>
        <Text size='md' weight='bold'>
          Wallet Features:
        </Text>
        <ul className='list-disc list-inside space-y-1'>
          <li>
            <Text size='sm'>Secure identity management</Text>
          </li>
          <li>
            <Text size='sm'>Transaction signing</Text>
          </li>
          <li>
            <Text size='sm'>Multiple identity support</Text>
          </li>
        </ul>
      </div>

      {error != null && (
        <div className='text-red-500 text-sm'>
          {error}
        </div>
      )}

      <Button
        colorScheme='brand'
        onClick={handleCreateClick}
        disabled={isLoading}
        className='w-full'
      >
        {isLoading ? 'Creating wallet...' : 'Create Wallet'}
      </Button>
    </div>
  )
}
