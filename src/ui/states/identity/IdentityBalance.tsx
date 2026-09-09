import React from 'react'
import { EyeClosedIcon, EyeOpenIcon, RefreshIcon, Text } from 'dash-ui-kit/react'
import { DashAmount, FiatChip } from '../home/DashAmount'
import { IDENTITY_MOCK } from './mock'

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

interface IdentityBalanceProps {
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
}

export function IdentityBalance ({ hide, onToggleHide, onRefresh }: IdentityBalanceProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3.5'>
      <Text size='lg' weight='medium' className='!leading-none !tracking-[-0.03em]'>
        <span className='text-dash-brand'>Identity</span> Balance:
      </Text>
      <div className='flex items-center gap-3'>
        <DashAmount
          whole={IDENTITY_MOCK.dashWhole}
          fraction={IDENTITY_MOCK.dashFraction}
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
      <FiatChip
        label={IDENTITY_MOCK.fiat}
        hide={hide}
        className='w-fit bg-white px-2 py-[5px] shadow-[0_0_48px_0_rgba(12,28,51,0.08)]'
        textClassName='!text-sm !leading-[1.2] !text-dash-brand'
      />
    </div>
  )
}
