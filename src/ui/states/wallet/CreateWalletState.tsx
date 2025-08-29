import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, List, Text, ValueCard } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { WalletType } from '../../../types'
import { withAccessControl } from '../../components/auth/withAccessControl'

function CreateWalletState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateWallet = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { walletId } = await extensionAPI.createWallet(WalletType.keystore)
      await extensionAPI.switchWallet(walletId)

      void navigate('/import-keystore')
    } catch (err) {
      setError((err as Error).toString())
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='xl' weight='bold'>
        Create Wallet
      </Text>

      <Text color='blue'>
        Create a new wallet to manage your identities and funds
      </Text>

      <ValueCard colorScheme='lightGray' size='xl' border={false} className='flex flex-col items-start gap-4'>
        <Text size='md' weight='bold'>
          Wallet Features:
        </Text>
        <List
          items={[
            { text: 'Secure identity management' },
            { text: 'Transaction signing' },
            { text: 'Multiple identity support' }
          ]}
          iconType='check'
          size='sm'
        />
      </ValueCard>

      {error != null && (
        <ValueCard className='text-red-500 text-sm'>
          <Text color='red'>
            {error}
          </Text>
        </ValueCard>
      )}

      <Button
        colorScheme='brand'
        onClick={async () => await handleCreateWallet().catch(e => console.warn('handleCreateWallet error: ', e))}
        disabled={isLoading}
        className='w-full'
      >
        {isLoading ? 'Creating wallet...' : 'Create Wallet'}
      </Button>
    </div>
  )
}

export default withAccessControl(CreateWalletState, {
  requireWallet: false
})
