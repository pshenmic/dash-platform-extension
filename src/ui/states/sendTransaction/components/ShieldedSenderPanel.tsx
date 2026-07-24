import React, { useState } from 'react'
import { Text, Button, ValueCard, BigNumber, ShieldSmallIcon } from 'dash-ui-kit/react'
import { PasswordField } from '../../../components/forms'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

export interface ShieldedSenderPanelProps {
  info: GetShieldedBalanceResponse | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
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

  return (
    <ValueCard colorScheme='lightGray' size='xl'>
      <div className='flex flex-col gap-3 w-full'>
        <div className='flex items-center gap-1.5'>
          <ShieldSmallIcon size={14} className='text-[rgba(12,28,51,0.5)]' />
          <Text size='sm' dim>Shielded balance</Text>
        </div>

        <div className='flex items-baseline gap-1.5'>
          <BigNumber className='!text-[1.5rem] gap-1 !text-dash-brand !font-bold'>
            {info.balance}
          </BigNumber>
          <Text dim className='!text-[0.7rem]'>Credits</Text>
        </div>

        <div className='grid grid-cols-2 gap-2 w-full'>
          <div className='rounded-[10px] bg-[rgba(12,28,51,0.04)] px-2.5 py-2 flex flex-col gap-1'>
            <Text dim className='!text-[0.7rem]'>Spendable notes:</Text>
            <Text weight='medium' className='!text-base text-dash-primary-dark-blue'>{info.spendableNotes}</Text>
          </div>
          <div className='rounded-[10px] bg-[rgba(12,28,51,0.04)] px-2.5 py-2 flex flex-col gap-1'>
            <Text dim className='!text-[0.7rem]'>Total notes:</Text>
            <Text weight='medium' className='!text-base text-dash-primary-dark-blue'>{info.totalNotes}</Text>
          </div>
        </div>

        {isWarmingProver && (
          <Text className='!text-[0.7rem]' dim>
            Preparing the private prover - this makes the first transfer faster.
          </Text>
        )}
      </div>
    </ValueCard>
  )
}
