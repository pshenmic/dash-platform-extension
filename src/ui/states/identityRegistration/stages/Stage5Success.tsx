import React from 'react'
import { Button, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { IdentityPreview } from '../../../components/Identities'
import type { IdentityPreviewData } from '../../../types'

interface Stage5SuccessProps {
  stage: number
  identity: IdentityPreviewData | null
  onDone: () => void
}

export function Stage5Success ({ stage, identity, onDone }: Stage5SuccessProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Congratulations!'
        description="Now you have your first Identity and you're ready to dive into the space of truly decentralized Web3 applications. Check out latest Dash Platform DApps on dashdapps.com"
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      {identity != null && (
        <div className='mt-3'>
          <IdentityPreview identity={identity} />
        </div>
      )}

      <div className='flex-1' />

      <div className='pb-[15px] flex flex-col gap-4 mt-8'>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={onDone}
        >
          Done
        </Button>
        <ProgressStepBar totalSteps={5} currentStep={stage} />
      </div>
    </div>
  )
}
