import React from 'react'
import { EyeClosedIcon, EyeOpenIcon, RefreshIcon, Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import { DashAmount, FiatChip } from '../home/DashAmount'
import { PLATFORM_MOCK } from './mock'

interface IconButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
}

function IconButton ({ label, onClick, children }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className='w-[27px] h-[27px] flex items-center justify-center rounded-lg bg-[rgba(12,28,51,0.12)] cursor-pointer hover:bg-[rgba(12,28,51,0.18)] transition-colors'
    >
      {children}
    </button>
  )
}

interface SliceProps {
  label: string
  whole: string
  fraction: string
  fiat: string
  hide: boolean
  className: string
}

function AllocationSlice ({ label, whole, fraction, fiat, hide, className }: SliceProps): React.JSX.Element {
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-5 px-[15px] py-3 bg-[rgba(12,28,51,0.04)] ${className}`}>
      <Text size='sm' weight='medium' className='!font-extrabold !leading-none !tracking-[-0.03em]'>
        {label}
      </Text>
      <div className='flex flex-col gap-2'>
        <DashAmount
          whole={whole}
          fraction={fraction}
          hide={hide}
          className='!text-sm !leading-none !tracking-[-0.03em] !text-dash-brand'
        />
        <FiatChip
          label={fiat}
          hide={hide}
          className='w-fit bg-[rgba(12,28,51,0.04)] px-2 py-[5px]'
          textClassName='!text-[10px] !leading-[1.2] !text-dash-brand'
        />
      </div>
    </div>
  )
}

interface BalanceBlockProps {
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

const bagelClassName = 'pointer-events-none absolute max-w-none h-auto select-none'

export function BalanceBlock ({ hide, onToggleHide, onRefresh }: BalanceBlockProps): React.JSX.Element {
  const bagel = useStaticAsset('coin_bagel.png')

  return (
    <div className='flex flex-col'>
      <div
        className='relative overflow-hidden rounded-t-[14px] px-[15px] py-[15px] bg-[rgba(12,28,51,0.04)]'
      >
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
              <span className='text-dash-brand'>Platform</span> Balance:
            </Text>
            <div className='flex items-center gap-3'>
              <DashAmount
                whole={PLATFORM_MOCK.dashWhole}
                fraction={PLATFORM_MOCK.dashFraction}
                hide={hide}
                className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
              />
              <div className='flex items-center gap-2'>
                <IconButton label={hide ? 'Show balance' : 'Hide balance'} onClick={onToggleHide}>
                  {hide
                    ? <EyeClosedIcon size={10} className='text-dash-primary-dark-blue' />
                    : <EyeOpenIcon size={10} className='text-dash-primary-dark-blue' />}
                </IconButton>
                <IconButton label='Refresh' onClick={onRefresh}>
                  <RefreshIcon size={10} className='text-dash-primary-dark-blue' />
                </IconButton>
              </div>
            </div>
          </div>
          <FiatChip
            label={PLATFORM_MOCK.fiat}
            hide={hide}
            className='bg-white px-2 py-[5px]'
            textClassName='!text-sm !leading-[1.2] !text-dash-brand'
          />
        </div>
      </div>
      <div className='flex w-full'>
        <AllocationSlice
          label='Shielded:'
          whole={PLATFORM_MOCK.shieldedWhole}
          fraction={PLATFORM_MOCK.shieldedFraction}
          fiat={PLATFORM_MOCK.shieldedFiat}
          hide={hide}
          className='rounded-bl-[14px]'
        />
        <AllocationSlice
          label='Addresses:'
          whole={PLATFORM_MOCK.addressesWhole}
          fraction={PLATFORM_MOCK.addressesFraction}
          fiat={PLATFORM_MOCK.addressesFiat}
          hide={hide}
          className=''
        />
        <AllocationSlice
          label='Identities'
          whole={PLATFORM_MOCK.identitiesWhole}
          fraction={PLATFORM_MOCK.identitiesFraction}
          fiat={PLATFORM_MOCK.identitiesFiat}
          hide={hide}
          className='rounded-br-[14px]'
        />
      </div>
    </div>
  )
}
