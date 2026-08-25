import React from 'react'
import { Button, Input, Text, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { FieldLabel } from '../../../components/typography'

interface Stage1IntroProps {
  stage: number
  password: string
  passwordError: string | null
  onPasswordChange: (value: string) => void
  onNext: () => void
}

export function Stage1Intro ({
  stage,
  password,
  passwordError,
  onPasswordChange,
  onNext
}: Stage1IntroProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <div className='pt-[176px]'>
        <TitleBlock
          title='Identity Top-up'
          description='Lets start the identity top-up process. You will be given an address and a QR code where you need to transfer funds. To continue press next.'
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />
      </div>

      <div className='flex-1' />

      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <FieldLabel>Password</FieldLabel>
          <Input
            type='password'
            placeholder='Enter your wallet password'
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            error={passwordError != null}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNext()
            }}
          />
          {passwordError != null && (
            <Text size='sm' className='text-red-500'>{passwordError}</Text>
          )}
        </div>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={onNext}
          disabled={password.trim() === ''}
        >
          Next
        </Button>
        <ProgressStepBar totalSteps={4} currentStep={stage} />
      </div>
    </div>
  )
}
