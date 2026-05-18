import React from 'react'
import { ErrorScreen } from '../../../components/layout/ErrorScreen'

interface TopUpErrorProps {
  stage: number
  error: string | null
  onReturnBack: () => void
}

export function TopUpError ({ stage, error, onReturnBack }: TopUpErrorProps): React.JSX.Element {
  return (
    <ErrorScreen
      title={
        <>
          <span className='font-normal'>There Was<br />an</span> Error With<br />Your Payment
        </>
      }
      error={error}
      defaultError='An unexpected error occurred while processing the top-up.'
      totalSteps={4}
      currentStep={stage}
      onReturnBack={onReturnBack}
    />
  )
}
