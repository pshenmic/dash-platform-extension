import React, { useState } from 'react'
import { Accordion, Button, Identifier, Text } from 'dash-ui-kit/react'
import { PasswordField } from '../../../components/forms'
import { Banner } from '../../../components/cards'
import { PROVING_WARNING } from '../../../constants/transferWarnings'
import { formatDashAmount, parseDashAmount } from '../../../../utils'
import { SHIELDED_MODES } from '../types'
import { KEEP_OPEN_MESSAGE, MOCK_TRANSFER_WARNING, WITHDRAW_WARNINGS } from '../constants'
import type { DirectionConfig } from '../directions/directionConfig'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferFee } from '../hooks/useTransferFee'
import type { TransferDraft } from '../types'
import { TransferDetails } from './TransferDetails'

interface ConfirmStepProps {
  draft: TransferDraft
  config: DirectionConfig
  amount: bigint
  balance: SourceBalance
  fee: TransferFee | null
  received: bigint | null
  isMock: boolean
  rate: number | null
  isSubmitting: boolean
  passwordError: string | null
  onPasswordChange: () => void
  onConfirm: (password: string) => void
}

// Step 3 of the send wizard: transfer details, password and the action button.
export function ConfirmStep ({ draft, config, amount, balance, fee, received, isMock, rate, isSubmitting, passwordError, onPasswordChange, onConfirm }: ConfirmStepProps): React.JSX.Element {
  const [password, setPassword] = useState('')
  const isProving = SHIELDED_MODES.includes(config.mode) || config.mode === 'coreShield'
  const isCrossLayerFromCore = draft.from.type === 'core' && draft.to.type !== 'core'

  return (
    <div className='flex flex-col gap-6'>
      <TransferDetails draft={draft} amount={amount} balance={balance} fee={fee} received={received} rate={rate} showTotal />

      {draft.isAdvanced && (
        <Accordion title={`${draft.recipients.length} ${draft.recipients.length === 1 ? 'recipient' : 'recipients'}`}>
          <div className='flex flex-col gap-2'>
            {draft.recipients.map(recipient => (
              <div key={recipient.id} className='flex items-center justify-between gap-3'>
                <Identifier highlight='both' middleEllipsis edgeChars={6} className='!text-xs min-w-0'>{recipient.address}</Identifier>
                <Text size='xs' className='shrink-0'><span className='font-bold'>{formatDashAmount(parseDashAmount(recipient.amount, balance.decimals) ?? 0n, balance.decimals)}</span> Dash</Text>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      <Banner variant='info' message={isMock ? MOCK_TRANSFER_WARNING : null} />
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

      {isCrossLayerFromCore && <Text size='xs' dim className='text-center -mb-3'>{KEEP_OPEN_MESSAGE}</Text>}

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
