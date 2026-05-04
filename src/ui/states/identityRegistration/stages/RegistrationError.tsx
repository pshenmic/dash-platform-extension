import React from 'react'
import { Button, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'

interface RegistrationErrorProps {
  stage: number
  registrationError: string | null
  recoverable: boolean
  onReturnBack: () => void
}

export function RegistrationError ({ stage, registrationError, recoverable, onReturnBack }: RegistrationErrorProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full pt-[90px]'>
      <TitleBlock
        title={
          <>
            <span className='font-normal'>There Was<br />an</span> Error With<br />Registration
          </>
        }
        description={registrationError ?? 'An unexpected error occurred while registering identity.'}
        logoSize='3rem'
        showLogo
        containerClassName='!mb-0'
      />

      <div className='flex-1' />

      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='lightBlue'
          className='w-full'
          onClick={onReturnBack}
        >
          {recoverable ? 'Try Again' : 'Start Over'}
        </Button>
        <ProgressStepBar
          totalSteps={5}
          currentStep={stage}
          color='red'
        />
      </div>
    </div>
  )
}
