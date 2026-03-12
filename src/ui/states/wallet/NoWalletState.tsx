import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { withAccessControl } from '../../components/auth/withAccessControl'

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
        console.log('Failed to check wallet status:', error)
      }
    }

    void checkWalletExists().catch(error => {
      console.log('Failed to check wallet exists in effect:', error)
    })
  }, [extensionAPI, navigate])

  const handleImportWallet = (): void => {
    void navigate('/choose-wallet-type')
  }

  return (
    <div className='flex flex-col h-full bg-white pb-2'>
      <div className='flex flex-col items-center text-center mb-3'>
        <div className='mb-8'>
          <TitleBlock
            title={
              <>
                <span className='!font-normal'>Welcome to</span> <span>Dash Platform Extension</span>
              </>
            }
            description='Enjoy all the benefits of Dash Platform in your browser'
            centered
            titleClassName='font-extrabold leading-tight'
            containerClassName='max-w-sm mx-auto'
          />
        </div>

        <Button
          autoFocus
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

export default withAccessControl(NoWalletState, {
  requireWallet: false
})
