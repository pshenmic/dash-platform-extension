import React from 'react'
import { Button, Text, ProgressStepBar, CreditsIcon } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { creditsToDash } from '../../../../utils'

interface TopUpResult {
  identityId: string
  stateTransitionHash: string
  topUpAmount: bigint
  date: Date
}

interface Stage4SuccessProps {
  stage: number
  result: TopUpResult | null
  dashRate: number | null
  onDone: () => void
}

function formatDate (date: Date): string {
  return date.toLocaleDateString('en-GB').replace(/\//g, '.')
}

function formatCredits (credits: bigint): string {
  return Number(credits).toLocaleString('en-US').replace(/,/g, ' ')
}

export function Stage4Success ({
  stage,
  result,
  dashRate,
  onDone
}: Stage4SuccessProps): React.JSX.Element {
  const usdValue = result != null && dashRate != null
    ? creditsToDash(result.topUpAmount) * dashRate
    : null

  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Congratulations!'
        description='You have successfully topped-up your identity! To finish this process press Done.'
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      {result != null && (
        <div className='mt-6 bg-white rounded-[15px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.1)] p-[15px] flex flex-col gap-5'>
          <div className='flex items-center justify-between'>
            <Text size='sm' weight='medium' className='tracking-[-0.03em]'>Balance:</Text>
            <Text size='xs' className='text-dash-primary-dark-blue/35 tracking-[-0.03em]'>
              Date: {formatDate(result.date)}
            </Text>
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='w-[30px] h-[30px] rounded-full bg-dash-primary-dark-blue/[0.05] flex items-center justify-center'>
                <CreditsIcon size={14} className='text-dash-brand' />
              </div>
              <Text size='sm' weight='medium'>Credits</Text>
            </div>
            <div className='flex flex-col items-end gap-1'>
              <Text size='sm' weight='medium' className='tracking-[-0.03em]'>
                <span className='font-extrabold text-dash-brand'>+ {formatCredits(result.topUpAmount)}</span>
                {' '}Credits
              </Text>
              {usdValue != null && (
                <Text size='xs' className='text-dash-primary-dark-blue/35'>
                  ~ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </div>
          </div>
        </div>
      )}

      <div className='flex-1' />

      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={onDone}
        >
          Done
        </Button>
        <ProgressStepBar totalSteps={4} currentStep={stage} />
      </div>
    </div>
  )
}
