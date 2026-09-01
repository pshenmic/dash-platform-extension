import React from 'react'
import { ExternalLinkIcon, Text, TopRightArrowIcon, Identifier } from 'dash-ui-kit/react'
import { DASHBOARD_MOCK } from './mock'

interface LastTransactionProps {
  hide: boolean
  amount?: string
  hash?: string
  layer?: string
  kind?: string
}

export function LastTransaction ({
  hide,
  amount = DASHBOARD_MOCK.lastTxAmount,
  hash = DASHBOARD_MOCK.lastTxHash,
  layer = DASHBOARD_MOCK.lastTxLayer,
  kind = DASHBOARD_MOCK.lastTxKind
}: LastTransactionProps): React.JSX.Element {
  return (
    <div className='relative flex flex-col gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='absolute top-4 right-4 flex items-center gap-1.5'>
        <div className='flex px-3 py-1.5 rounded-full bg-[rgba(12,28,51,0.04)]'>
          <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-primary-dark-blue'>
            {kind}
          </Text>
        </div>
        <div className='flex px-3 py-1.5 rounded-full bg-[rgba(76,126,255,0.12)]'>
          <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-brand'>
            {layer}
          </Text>
        </div>
      </div>
      <div className='flex items-center gap-2 pr-28'>
        <div className='w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0'>
          <TopRightArrowIcon size={10} className='!text-[#CD2E00]' />
        </div>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
          Last Transaction
        </Text>
      </div>
      <div className='flex flex-col gap-2'>
        <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
          {hide ? '••••••' : amount}{' '}
          <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>Dash</Text>
        </Text>
        <div className='flex items-center gap-1'>
          <Identifier highlight='both' ellipsis className='!text-[9px] font-bold'>
            {hash}
          </Identifier>
          <div className='p-0.5 rounded-[2px] bg-[rgba(12,28,51,0.05)]'>
            <ExternalLinkIcon size={8} className='!text-dash-primary-dark-blue/48' />
          </div>
        </div>
      </div>
    </div>
  )
}
