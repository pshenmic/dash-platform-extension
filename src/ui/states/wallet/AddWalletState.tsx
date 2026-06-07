import React from 'react'
import { Button } from 'dash-ui-kit/react'
import { useNavigate } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'

function AddWalletState (): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='flex flex-col h-full bg-white pb-2'>
      <div className='flex flex-col items-center text-center mb-3'>
        <div className='mb-8'>
          <TitleBlock
            title={<><span className='!font-normal'>Welcome to</span> Dash Platform Extension</>}
            description='Enjoy all the benefits of Dash Platform in your browser'
            centered
            titleClassName='font-extrabold leading-tight'
            containerClassName='max-w-sm mx-auto'
          />
        </div>

        <div className='flex flex-col gap-3 w-full'>
          <Button
            autoFocus
            colorScheme='brand'
            size='xl'
            onClick={() => { void navigate('/create-seed-wallet') }}
            className='w-full h-[3.625rem]'
          >
            Create Wallet
          </Button>

          <Button
            variant='outline'
            colorScheme='brand'
            size='xl'
            onClick={() => { void navigate('/choose-wallet-type') }}
            className='w-full h-[3.625rem]'
          >
            Import Wallet
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(AddWalletState, {
  requireWallet: false
})
