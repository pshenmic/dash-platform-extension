import React from 'react'
import { BigNumber, Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import { DashAmount } from '../home/DashAmount'
import { CORE_MOCK } from './mock'
import { BalanceActions } from '../../components/common'

interface CoreBalanceProps {
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

const bagelClassName = 'pointer-events-none absolute max-w-none h-auto select-none'

export function CoreBalance ({ hide, onToggleHide, onRefresh }: CoreBalanceProps): React.JSX.Element {
  const bagel = useStaticAsset('coin_bagel.png')

  return (
    <div className='relative overflow-hidden rounded-[14px] px-[15px] py-[15px] bg-[rgba(12,28,51,0.04)]'>
      <img
        src={bagel}
        alt=''
        className={`${bagelClassName} top-[-94%] left-[-65%] w-[300px] opacity-100`}
      />
      <img
        src={bagel}
        alt=''
        className={`${bagelClassName} top-[-122%] right-[-48%] w-[300px] opacity-90`}
      />
      <div className='relative z-10 flex flex-col items-center gap-3.5'>
        <div className='flex flex-col items-center gap-2'>
          <Text size='lg' weight='medium' className='!leading-none !tracking-[-0.03em]'>
            Total <span className='text-dash-brand'>Core</span> Balance:
          </Text>
          <div className='flex items-center gap-3'>
            <DashAmount
              whole={CORE_MOCK.dashWhole}
              fraction={CORE_MOCK.dashFraction}
              hide={hide}
              className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
            />
            <BalanceActions hide={hide} onToggleHide={onToggleHide} onRefresh={onRefresh} />
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Text size='sm' weight='medium' className='!leading-[1.2] !text-dash-brand'>
            {hide ? '~ ••• USD' : CORE_MOCK.fiat}
          </Text>
          <div className='w-px h-4 bg-dash-primary-dark-blue/16' />
          <Text size='sm' weight='medium' className='!leading-[1.2] !text-dash-brand'>
            {hide ? '••••••' : <BigNumber>{CORE_MOCK.credits}</BigNumber>} Credits
          </Text>
        </div>
      </div>
    </div>
  )
}
