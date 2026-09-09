import React from 'react'
import { EyeClosedIcon, EyeOpenIcon, RefreshIcon, Text } from 'dash-ui-kit/react'
import { creditsToDash } from '../../../utils'
import { DashAmount, FiatChip } from '../home/DashAmount'

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

function dashParts (credits: bigint): { whole: string, fraction: string } {
  const [whole, fraction = '00'] = creditsToDash(credits).toFixed(2).split('.')
  return { whole, fraction }
}

interface IdentityBalanceProps {
  hide: boolean
  loading: boolean
  error: string | null
  credits: bigint | null
  rate: number | null
  onToggleHide: () => void
  onRefresh: () => void
}

export function IdentityBalance ({
  hide,
  loading,
  error,
  credits,
  rate,
  onToggleHide,
  onRefresh
}: IdentityBalanceProps): React.JSX.Element {
  const parts = credits != null ? dashParts(credits) : null
  const fiat = credits != null && rate != null && rate > 0
    ? `~ $${(creditsToDash(credits) * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    : null

  return (
    <div className='flex flex-col gap-3.5'>
      <Text size='lg' weight='medium' className='!leading-none !tracking-[-0.03em]'>
        <span className='text-dash-brand'>Identity</span> Balance:
      </Text>
      <div className='flex items-center gap-3'>
        {loading
          ? (
            <Text className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'>...</Text>
            )
          : (error != null && error !== '')
              ? (
                <Text className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-red-500'>Error</Text>
                )
              : parts != null
                ? (
                  <DashAmount
                    whole={parts.whole}
                    fraction={parts.fraction}
                    hide={hide}
                    className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
                  />
                  )
                : (
                  <Text className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-primary-dark-blue/35'>N/A</Text>
                  )}
        <div className='flex items-center gap-2'>
          <IconButton label={hide ? 'Show balance' : 'Hide balance'} onClick={onToggleHide}>
            {hide
              ? <EyeClosedIcon size={10} className='text-dash-primary-dark-blue' />
              : <EyeOpenIcon size={10} className='text-dash-primary-dark-blue' />}
          </IconButton>
          <IconButton label='Refresh' onClick={onRefresh}>
            <RefreshIcon
              size={10}
              className={loading ? 'animate-spin text-dash-primary-dark-blue' : 'text-dash-primary-dark-blue'}
            />
          </IconButton>
        </div>
      </div>
      {fiat != null && (
        <FiatChip
          label={fiat}
          hide={hide}
          className='w-fit bg-white px-2 py-[5px] shadow-[0_0_48px_0_rgba(12,28,51,0.08)]'
          textClassName='!text-sm !leading-[1.2] !text-dash-brand'
        />
      )}
    </div>
  )
}
