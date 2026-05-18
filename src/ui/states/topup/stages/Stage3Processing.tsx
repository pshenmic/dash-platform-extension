import React from 'react'
import { Text, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'

interface Stage3ProcessingProps {
  stage: number
}

export function Stage3Processing ({ stage }: Stage3ProcessingProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title={<>We received your<br />payment</>}
        description='Please kindly wait for all the steps to be processed by the network. Usually, it takes less than 10 seconds.'
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-12 h-12 rounded-full border-4 border-dash-brand border-t-transparent animate-spin' />
          <Text size='sm' dim>Processing…</Text>
        </div>
      </div>

      <ProgressStepBar totalSteps={4} currentStep={stage} />
    </div>
  )
}
