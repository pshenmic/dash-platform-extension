import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, Text, Button, ProgressStepBar, DashLogo } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

function NoWalletState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()

  useEffect(() => {
    const checkWalletExists = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()

        if (status.currentWalletId != null && status.currentWalletId !== '') {
          void navigate('/home')
        }
      } catch (error) {
        console.warn('Failed to check wallet status:', error)
      }
    }

    void checkWalletExists()
  }, [extensionAPI, navigate])

  const handleImportWallet = (): void => {
    void navigate('/choose-wallet-type')
  }

  const handleCreateWallet = (): void => {
    void navigate('/create-wallet')
  }

  return (
    <div className='flex flex-col h-full bg-white pb-2'>
      <div className='flex flex-col items-center text-center mb-3'>
        <div className='flex items-center justify-center w-12 h-12'>
          <DashLogo />
        </div>

        <div className='mb-8'>
          <Heading level={1} className='text-3xl font-extrabold text-gray-900 mb-2 leading-tight'>
            <span className='!font-normal'>Welcome to</span> <span>Dash Platform Extension</span>
          </Heading>
          <div className='!leading-tight max-w-sm mx-auto'>
            <Text size='sm' dim>
              Enjoy all the benefits of Dash Platform in your browser
            </Text>
          </div>
        </div>

        <Button
          colorScheme='brand'
          size='xl'
          onClick={handleImportWallet}
          className='w-full'
        >
          Create Wallet
        </Button>
      </div>
    </div>
  )
}

export default NoWalletState
