import React from 'react'
import { Button, Text, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'

interface Stage3ProcessingProps {
  stage: number
  isProcessing: boolean
  error: string | null
  onRetry: () => void
}

export function Stage3Processing ({
  stage,
  isProcessing,
  error,
  onRetry
}: Stage3ProcessingProps): React.JSX.Element {
  const hasError = error != null

  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title={hasError ? <>Top-up<br />Failed</> : <>We received your<br />payment</>}
        description={
          hasError
            ? error
            : 'Please kindly wait for all the steps to be processed by the network. Usually, it takes less than 10 seconds.'
        }
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
        titleClassName={hasError ? 'text-red-500' : undefined}
      />

      {!hasError && isProcessing && (
        <div className='flex-1 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-full border-4 border-dash-brand border-t-transparent animate-spin' />
            <Text size='sm' dim>Processing…</Text>
          </div>
        </div>
      )}

      <div className='flex-1' />

      {hasError && (
        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={onRetry}
          >
            Try Again
          </Button>
          <ProgressStepBar totalSteps={4} currentStep={stage} />
        </div>
      )}

      {!hasError && (
        <ProgressStepBar totalSteps={4} currentStep={stage} />
      )}
    </div>
  )
}
