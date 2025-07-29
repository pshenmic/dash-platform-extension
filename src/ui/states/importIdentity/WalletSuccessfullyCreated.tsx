import React from 'react'
import { Text, Heading, Button, DashLogo } from 'dash-ui/react'
import { useNavigate } from 'react-router-dom'
import { useStaticAsset } from '../../hooks/useStaticAsset'

function WalletSuccessfullyCreated(): React.JSX.Element {
  const navigate = useNavigate()

  const handleContinue = () => {
    navigate('/home')
  }

  return (
    <div className='relative flex flex-col h-full'>
      <div className='absolute inset-0 pointer-events-none'>
        <img
          src={useStaticAsset('spiral-of-squares.png')}
          alt='Dashboard App'
          // className='absolute w-[900px] h-[214px] max-w-none -left-[69px] -bottom-[580px] transform rotate-8'
          className='absolute w-[900px] -left-[65%] max-w-none -top-[709px]'
        />

        <img
          src={useStaticAsset('spiral-of-squares.png')}
          alt='Dashboard App'
          // className='absolute w-[900px] left-[50%] top-[194px] rotate-8 opacity-90'
          className='absolute w-[900px] -left-[50%] max-w-none -bottom-[580px] rotate-8'
        />
      </div>

      {/* Main Content */}
      <div className='relative z-10 flex flex-col h-full pt-24 pb-36'>
        <div className='flex flex-col items-center text-center gap-2.5 mb-8'>
          <div className='flex items-center justify-center w-12 h-12'>
            <DashLogo/>
          </div>

          <Heading level={1}>
            Your Wallet Was<br/><span className='text-dash-brand'>Successfully Created</span>
          </Heading>
          
          <Text size='sm' dim className='text-center max-w-xs'>
            Enjoy the best Dash Platform experience in browser!
          </Text>
        </div>

        {/* Spacer */}
        <div className='flex-1' />

        {/* Continue Button */}
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

export default WalletSuccessfullyCreated
