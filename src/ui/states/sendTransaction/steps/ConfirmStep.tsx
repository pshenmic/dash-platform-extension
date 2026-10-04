import React, { useState } from 'react'
import { Button } from 'dash-ui-kit/react'
import { PasswordField } from '../../../components/forms'
import { Banner } from '../../../components/cards'
import { PROVING_WARNING } from '../../../constants/transferWarnings'
import { SHIELDED_MODES } from '../types'
import { WITHDRAW_WARNINGS } from '../constants'
import type { DirectionConfig } from '../directions/directionConfig'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferDraft } from '../types'
import { TransferDetails } from './TransferDetails'

interface ConfirmStepProps {
  draft: TransferDraft
  config: DirectionConfig
  amount: bigint
  balance: SourceBalance
  feeCredits: bigint | null
  rate: number | null
  isSubmitting: boolean
  passwordError: string | null
  onPasswordChange: () => void
  onConfirm: (password: string) => void
}

// Step 3 of the send wizard: transfer details, password and the action button.
export function ConfirmStep ({ draft, config, amount, balance, feeCredits, rate, isSubmitting, passwordError, onPasswordChange, onConfirm }: ConfirmStepProps): React.JSX.Element {
  const [password, setPassword] = useState('')
  const isProving = SHIELDED_MODES.includes(config.mode)

  return (
    <div className='flex flex-col gap-6'>
      <TransferDetails draft={draft} amount={amount} balance={balance} feeCredits={feeCredits} rate={rate} showTotal />

      <Banner variant='warning' message={WITHDRAW_WARNINGS[config.mode] ?? null} />
      {isProving && <Banner variant='warning' message={PROVING_WARNING} />}

      <PasswordField
        label='Password'
        value={password}
        onChange={(value) => { setPassword(value); onPasswordChange() }}
        placeholder='Your Password'
        error={passwordError}
        variant='outlined'
      />

      <Button
        colorScheme='brand'
        size='xl'
        className='w-full'
        disabled={isSubmitting || password === ''}
        onClick={() => onConfirm(password)}
      >
        {isSubmitting ? (isProving ? 'Building proof - keep this open...' : 'Sending...') : config.confirmLabel}
      </Button>
    </div>
  )
}
