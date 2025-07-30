import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, Text, Button, ProgressStepBar, DashLogo } from 'dash-ui/react'

function NoWalletState(): React.JSX.Element {
  const navigate = useNavigate()

  const handleImportWallet = () => {
    navigate('/choose-wallet-import-type')
  }

  const handleCreateWallet = () => {
    // TODO: Implement create wallet functionality
    console.log('Create wallet clicked')
    navigate('/create-wallet')
  }

  return (
    <div className='flex flex-col h-full bg-white pb-12 pt-8'>
      <div className='flex flex-col items-center text-center mb-3'>
        <div className='flex items-center justify-center w-12 h-12'>
          <DashLogo/>
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

        <div className='w-full max-w-sm space-y-3'>
          <Button
            colorScheme='brand'
            size='xl'
            onClick={handleCreateWallet}
            disabled={true}
            className='w-full'
          >
            Create Wallet
          </Button>
          
          <Button
            colorScheme='brand'
            size='xl'
            onClick={handleImportWallet}
            className='w-full'
          >
            Import Wallet
          </Button>
        </div>
      </div>

      <div className='mt-auto'>
        <ProgressStepBar currentStep={1} totalSteps={4} />
      </div>
    </div>
  )
}

export default NoWalletState
