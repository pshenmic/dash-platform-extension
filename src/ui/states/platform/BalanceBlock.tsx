import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import type { UsePlatformAddressesResult } from '../../hooks'
import { DashAmount, FiatChip } from '../home/DashAmount'
import { BalanceActions } from '../../components/common'
import { creditsToDash, toCreditsBigInt } from '../../../utils'

// Shown instead of a number whenever the value is unknown, never a made-up one.
const PLACEHOLDER = '-'

function dashParts (credits: bigint): { whole: string, fraction: string } {
  const [whole, fraction = '00'] = creditsToDash(credits).toFixed(2).split('.')
  return { whole, fraction }
}

function fiatLabel (credits: bigint | null, rate: number | null): string | null {
  if (credits == null || rate == null || rate <= 0) return null
  return `~ $${(creditsToDash(credits) * rate).toFixed(2)} USD`
}

interface SliceProps {
  label: string
  credits: bigint | null
  rate: number | null
  hide: boolean
  className: string
  action?: React.ReactNode
}

function AllocationSlice ({ label, credits, rate, hide, className, action }: SliceProps): React.JSX.Element {
  const parts = credits != null ? dashParts(credits) : null
  const fiat = fiatLabel(credits, rate)

  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-5 px-[15px] py-3 bg-[rgba(12,28,51,0.04)] ${className}`}>
      <Text size='sm' weight='medium' className='!font-extrabold !leading-none !tracking-[-0.03em]'>
        {label}
      </Text>
      <div className='flex flex-col gap-2'>
        {parts != null
          ? (
            <DashAmount
              whole={parts.whole}
              fraction={parts.fraction}
              hide={hide}
              className='!text-sm !leading-none !tracking-[-0.03em] !text-dash-brand'
            />
            )
          : (
            <Text size='sm' className='!leading-none !tracking-[-0.03em] !text-dash-primary-dark-blue/35'>
              {PLACEHOLDER}
            </Text>
            )}
        {fiat != null
          ? (
            <FiatChip
              label={fiat}
              hide={hide}
              className='w-fit bg-[rgba(12,28,51,0.04)] px-2 py-[5px]'
              textClassName='!text-[10px] !leading-[1.2] !text-dash-brand'
            />
            )
          : action}
      </div>
    </div>
  )
}

interface BalanceBlockProps {
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
  /** Sum of the credits held by the wallet identities. Null while loading. */
  identityCredits: bigint | null
  /** Platform addresses shared with the rest of the dashboard. */
  platform: UsePlatformAddressesResult
  /** Shielded credits, null until the user unlocks them with the password. */
  shieldedCredits: bigint | null
  /** Sends the user to the Shield addresses sub-tab, where the password is entered. */
  onUnlockShielded: () => void
  rate: number | null
  loading: boolean
}

const bagelClassName = 'pointer-events-none absolute max-w-none h-auto select-none'

export function BalanceBlock ({
  hide,
  onToggleHide,
  onRefresh,
  identityCredits,
  platform,
  shieldedCredits,
  onUnlockShielded,
  rate,
  loading
}: BalanceBlockProps): React.JSX.Element {
  const bagel = useStaticAsset('coin_bagel.png')

  const addressesCredits = platform.hasLoaded && !platform.isLoading
    ? platform.addresses.reduce((sum, item) => sum + (toCreditsBigInt(item.balance) ?? 0n), 0n)
    : null

  const knownParts = [identityCredits, addressesCredits, shieldedCredits].filter(
    (value): value is bigint => value != null
  )
  const totalCredits = knownParts.length > 0
    ? knownParts.reduce((sum, value) => sum + value, 0n)
    : null
  const totalParts = totalCredits != null ? dashParts(totalCredits) : null
  const totalFiat = fiatLabel(totalCredits, rate)

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
              {totalParts != null
                ? (
                  <DashAmount
                    whole={totalParts.whole}
                    fraction={totalParts.fraction}
                    hide={hide}
                    className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-brand'
                  />
                  )
                : (
                  <Text className='!text-[2.25rem] !leading-none !tracking-[-0.03em] !text-dash-primary-dark-blue/35'>
                    {PLACEHOLDER}
                  </Text>
                  )}
              <BalanceActions
                hide={hide}
                onToggleHide={onToggleHide}
                onRefresh={onRefresh}
                loading={loading}
              />
            </div>
          </div>
          {totalFiat != null && (
            <FiatChip
              label={totalFiat}
              hide={hide}
              className='bg-white px-2 py-[5px]'
              textClassName='!text-sm !leading-[1.2] !text-dash-brand'
            />
          )}
        </div>
      </div>
      <div className='flex w-full'>
        <AllocationSlice
          label='Shielded:'
          credits={shieldedCredits}
          rate={rate}
          hide={hide}
          className='rounded-bl-[14px]'
          action={shieldedCredits == null
            ? (
              <button
                type='button'
                className='flex shrink-0 w-fit items-center px-2 py-[5px] rounded-full bg-[rgba(12,28,51,0.04)] border-0 cursor-pointer'
                onClick={onUnlockShielded}
              >
                <Text size='xs' weight='medium' className='!text-[10px] !leading-[1.2] !text-dash-brand'>
                  Unlock
                </Text>
              </button>
              )
            : undefined}
        />
        <AllocationSlice
          label='Addresses:'
          credits={addressesCredits}
          rate={rate}
          hide={hide}
          className=''
        />
        <AllocationSlice
          label='Identities'
          credits={identityCredits}
          rate={rate}
          hide={hide}
          className='rounded-br-[14px]'
        />
      </div>
    </div>
  )
}
