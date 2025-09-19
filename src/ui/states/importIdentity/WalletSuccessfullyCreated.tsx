import React from 'react'
import { Button } from 'dash-ui-kit/react'
import { useNavigate } from 'react-router-dom'
import { useStaticAsset } from '../../hooks/useStaticAsset'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'

function WalletSuccessfullyCreated (): React.JSX.Element {
  const navigate = useNavigate()

  const handleContinue = (): void => {
    void navigate('/home')
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden inset-0 pointer-events-none'>
        <img
          src={useStaticAsset('spiral-of-squares.png')}
          alt='Dashboard App'
          className='absolute w-[900px] -left-[65%] max-w-none -top-[709px]'
        />

        <img
          src={useStaticAsset('spiral-of-squares.png')}
          alt='Dashboard App'
          className='absolute w-[900px] -left-[50%] max-w-none -bottom-[580px] rotate-8'
        />
      </div>

      <div className='z-10 flex flex-col h-full pt-16 pb-36'>
        <div className='flex flex-col items-center text-center gap-2.5 mb-8'>
          <TitleBlock
            title={
              <>
                Your Wallet Was<br /><span className='text-dash-brand'>Successfully Created</span>
              </>
            }
            description='Enjoy the best Dash Platform experience in browser!'
            centered
          />
        </div>

        <div className='w-full'>
          <Button
            onClick={handleContinue}
            colorScheme='brand'
            size='xl'
            className='w-full'
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(WalletSuccessfullyCreated)
