import React from 'react'
import { ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'

interface Stage4ProcessingProps {
  stage: number
  coinBagelImage: string | undefined
  isRegistering: boolean
}

export function Stage4Processing ({ stage, coinBagelImage, isRegistering }: Stage4ProcessingProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full relative'>
      <div className='absolute right-[-1rem] top-[100%] w-full h-[240px] overflow-hidden pointer-events-none translate-y-[-100%]'>
        <img src={coinBagelImage} alt='' className='w-[552px] h-[513px] object-cover object-left' />
      </div>
      <div
        className='absolute h-[130px]'
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 85%)',
          top: '100%',
          width: 'calc(100% + 1rem)',
          transform: 'translateY(calc(-100% + 0.875rem))'
        }}
      />

      <div className='relative z-10 flex flex-col h-full'>
        <TitleBlock
          title={isRegistering ? <>Registering your<br />Identity…</> : <>We received your<br />payment</>}
          description={
            isRegistering
              ? 'Please wait while we register your identity on the Dash Platform network.'
              : 'Please kindly wait for all Identity registration transactions to be processed by the network. Usually, it takes less than 10 seconds.'
          }
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='flex-1' />

        <div>
          <ProgressStepBar totalSteps={5} currentStep={stage} />
        </div>
      </div>
    </div>
  )
}
