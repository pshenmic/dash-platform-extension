import React from 'react'
import { ProcessingScreen } from '../../../components/layout/screens/ProcessingScreen'

interface Stage4ProcessingProps {
  stage: number
  isRegistering: boolean
}

export function Stage4Processing ({ stage, isRegistering }: Stage4ProcessingProps): React.JSX.Element {
  return (
    <ProcessingScreen
      stage={stage}
      totalSteps={5}
      title={isRegistering ? <>Registering your<br />Identity…</> : <>We received your<br />payment</>}
      description={
        isRegistering
          ? 'Please wait while we register your identity on the Dash Platform network.'
          : 'Please kindly wait for all Identity registration transactions to be processed by the network. Usually, it takes less than 10 seconds.'
      }
    />
  )
}
