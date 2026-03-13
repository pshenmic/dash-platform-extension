import React from 'react'
import { Button, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { IdentityPreview } from '../../../components/Identities'
import type { IdentityPreviewData } from '../../../types'

const mockIdentity: IdentityPreviewData = {
  id: 'EWNwtGEC1qAbgNgo2UgadmQhB9DaZtB942x8bXgJrPNS',
  name: 'test.dash',
  balance: '0.5',
  publicKeys: [
    {
      keyId: 0,
      purpose: 'AUTHENTICATION',
      securityLevel: 'MASTER',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 1,
      purpose: 'AUTHENTICATION',
      securityLevel: 'CRITICAL',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 2,
      purpose: 'AUTHENTICATION',
      securityLevel: 'HIGH',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 3,
      purpose: 'ENCRYPTION',
      securityLevel: 'MEDIUM',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    }
  ]
}

interface Stage5SuccessProps {
  stage: number
  registeredIdentifier: string | null
  onDone: () => void
}

export function Stage5Success ({ stage, registeredIdentifier, onDone }: Stage5SuccessProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Congratulations!'
        description="Now you have your first Identity and you're ready to dive into the space of truly decentralized Web3 applications. Check out latest Dash Platform DApps on dashdapps.com"
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      {registeredIdentifier != null && (
        <div className='mt-3'>
          <IdentityPreview identity={mockIdentity} />
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
