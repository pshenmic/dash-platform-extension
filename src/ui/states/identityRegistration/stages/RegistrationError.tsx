import React from 'react'
import { ErrorScreen } from '../../../components/layout/ErrorScreen'

interface RegistrationErrorProps {
  stage: number
  registrationError: string | null
  onReturnBack: () => void
}

export function RegistrationError ({ stage, registrationError, onReturnBack }: RegistrationErrorProps): React.JSX.Element {
  return (
    <ErrorScreen
      title={
        <>
          <span className='font-normal'>There Was<br />an</span> Error With<br />Registration
        </>
      }
      error={registrationError}
      defaultError='An unexpected error occurred while registering identity.'
      totalSteps={5}
      currentStep={stage}
      onReturnBack={onReturnBack}
    />
  )
}
