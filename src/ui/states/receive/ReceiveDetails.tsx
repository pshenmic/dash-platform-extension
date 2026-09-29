import React from 'react'
import { BigNumber, Text, Tooltip } from 'dash-ui-kit/react'
import { creditsToDashDisplay, creditsToUsdEquivalent, toCreditsBigInt } from '../../../utils'
import { RECEIVE_TYPE_FULL_LABELS, type ReceiveTarget } from './types'

interface ReceiveDetailsProps {
  target: ReceiveTarget
  hide: boolean
  rate: number | null
}

/** What this destination is and what it holds. The layer warning sits above the QR. */
export function ReceiveDetails ({ target, hide, rate }: ReceiveDetailsProps): React.JSX.Element {
  // Platform balances arrive in credits; Dash is the unit people think in, so
  // it leads and credits move into the tooltip.
  const credits = target.unit === 'Credits' ? toCreditsBigInt(target.balance) : null
  const dashAmount = credits != null ? creditsToDashDisplay(credits) : target.balance
  const fiat = creditsToUsdEquivalent(credits, rate)

  const amount = (
    <Text size='sm' weight='medium' className='!text-[0.875rem] !leading-[17px] !text-dash-primary-dark-blue whitespace-nowrap'>
      {hide ? '••••••' : dashAmount != null ? <BigNumber>{dashAmount}</BigNumber> : '—'}{' '}
      <Text as='span' size='sm' weight='medium' className='!text-[0.875rem] !leading-[17px] !text-dash-primary-dark-blue'>
        Dash
      </Text>
    </Text>
  )

  return (
    <div className='flex items-center justify-between gap-3 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex flex-col gap-1 min-w-0'>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
          {RECEIVE_TYPE_FULL_LABELS[target.type]} · {target.unit}
        </Text>
        <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
          On {target.layer}
        </Text>
      </div>
      <div className='flex flex-col items-end gap-[5px] shrink-0'>
        {credits != null && !hide
          ? (
            <Tooltip
              content={(
                <span className='inline-flex items-baseline gap-1 whitespace-nowrap text-dash-primary-dark-blue'>
                  <span className='text-[0.875rem] font-medium'>
                    <BigNumber>{credits.toString()}</BigNumber>
                  </span>
                  <span className='text-[0.625rem] font-medium text-dash-primary-dark-blue/64'>Credits</span>
                </span>
                )}
            >
              <span className='cursor-help'>{amount}</span>
            </Tooltip>
            )
          : amount}
        {fiat != null && (
          <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-brand'>
            {hide ? '••••••' : fiat}
          </Text>
        )}
      </div>
    </div>
  )
}
