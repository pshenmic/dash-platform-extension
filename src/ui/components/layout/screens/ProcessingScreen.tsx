import React from 'react'
import { ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../TitleBlock'
import { useStaticAsset } from '../../../hooks'

interface ProcessingScreenProps {
  stage: number
  totalSteps: number
  title: React.ReactNode
  description: string
}

export function ProcessingScreen ({
  stage,
  totalSteps,
  title,
  description
}: ProcessingScreenProps): React.JSX.Element {
  const coinBagelImage = useStaticAsset('coin_bagel.png')

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
          title={title}
          description={description}
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='flex-1' />

        <div>
          <ProgressStepBar totalSteps={totalSteps} currentStep={stage} />
        </div>
      </div>
    </div>
  )
}
