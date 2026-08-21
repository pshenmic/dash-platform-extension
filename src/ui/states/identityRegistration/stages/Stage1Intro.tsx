import React from 'react'
import { Button, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'

interface Stage1IntroProps {
  stage: number
  onNext: () => void
}

export function Stage1Intro ({ stage, onNext }: Stage1IntroProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <div className='pt-[176px]'>
        <TitleBlock
          title='Identity Registration'
          description='Lets start the identity creation process. A small fee will be taken for the registration. To continue press next.'
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />
      </div>

      <div className='flex-1' />

      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={onNext}
        >
          Next
        </Button>
        <ProgressStepBar totalSteps={5} currentStep={stage} />
      </div>
    </div>
  )
}
