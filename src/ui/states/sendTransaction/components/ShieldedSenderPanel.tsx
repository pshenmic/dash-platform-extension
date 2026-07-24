import React, { useState } from 'react'
import { Text, Button, ValueCard, CircleProcessIcon, ShieldSmallIcon } from 'dash-ui-kit/react'
import { PasswordField } from '../../../components/forms'
import { creditsToUsdEquivalent } from '../../../../utils'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

export interface ShieldedSenderPanelProps {
  info: GetShieldedBalanceResponse | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  rate: number | null
  onUnlock: (password: string) => void
  onErrorClear: () => void
}

/**
 * Sender detail for the shielded balance.
 */
export function ShieldedSenderPanel ({
  info,
  isUnlocking,
  isWarmingProver,
  error,
  rate,
  onUnlock,
  onErrorClear
}: ShieldedSenderPanelProps): React.JSX.Element {
  const [password, setPassword] = useState('')

  if (info == null) {
    return (
      <div className='flex flex-col gap-2.5'>
        <Text size='sm' dim>
          Enter your password to read your shielded balance. It is needed again to sign the transfer.
        </Text>
        <PasswordField
          value={password}
          onChange={(value) => { setPassword(value); onErrorClear() }}
          placeholder='Your Password'
          error={error}
          variant='outlined'
        />
        <Button
          colorScheme='lightBlue'
          onClick={() => { onUnlock(password); setPassword('') }}
          disabled={isUnlocking || password === ''}
        >
          {isUnlocking ? 'Unlocking...' : 'Unlock shielded balance'}
        </Button>
      </div>
    )
  }

  const balance = BigInt(info.balance)
  const usd = creditsToUsdEquivalent(balance, rate)

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-1.5'>
        <ShieldSmallIcon size={14} className='text-[rgba(12,28,51,0.5)]' />
        <Text size='sm' dim>Shielded balance</Text>
      </div>

      <div className='flex items-center gap-2'>
        <div className='flex items-baseline gap-1'>
          <Text weight='bold' className='!text-[1rem]'>{balance.toLocaleString()}</Text>
          <Text className='!text-[0.75rem]' dim>Credits</Text>
        </div>
        {usd != null && (
          <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
            <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
              {usd}
            </Text>
          </ValueCard>
        )}
      </div>

      {isWarmingProver && (
        <div className='flex items-center gap-1.5'>
          <CircleProcessIcon className='w-3.5 h-3.5 text-dash-brand animate-spin shrink-0' />
          <Text className='!text-[0.7rem]' dim>
            Preparing the private prover - this makes the first transfer faster.
          </Text>
        </div>
      )}
    </div>
  )
}
