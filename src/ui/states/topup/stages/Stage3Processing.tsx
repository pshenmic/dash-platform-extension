import React from 'react'
import { ProcessingScreen } from '../../../components/layout/screens/ProcessingScreen'

interface Stage3ProcessingProps {
  stage: number
}

export function Stage3Processing ({ stage }: Stage3ProcessingProps): React.JSX.Element {
  return (
    <ProcessingScreen
      stage={stage}
      totalSteps={4}
      title={<>We received your<br />payment</>}
      description='Please kindly wait for all the steps to be processed by the network. Usually, it takes less than 10 seconds.'
    />
  )
}
