import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { IdentitySelect } from '../../../../components/identity/IdentitySelect'
import { PasswordGate } from '../../../../components/forms'
import { FiatChip } from '../../../../components/common'
import { Banner } from '../../../../components/cards'
import { dashAmountToUsd, formatDashAmount } from '../../../../../utils'
import { SHIELDED_UNLOCK_DESCRIPTION } from '../../constants'
import type { TransferDraft } from '../../types'
import type { SourceBalance } from '../../hooks/useSourceBalance'

interface ShieldedState {
  balance: bigint | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  unlock: (password: string) => Promise<string | null>
}

interface SourceRowProps {
  draft: TransferDraft
  identities: string[]
  onIdentityChange: (identityId: string) => void
  balance: SourceBalance
  rate: number | null
  shielded: ShieldedState
}

function BalanceLine ({ balance, rate }: { balance: SourceBalance, rate: number | null }): React.JSX.Element | null {
  if (balance.amount == null) return null

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <Text size='xs' dim>
        Balance: <span className='font-bold text-dash-primary-dark-blue'>{formatDashAmount(balance.amount, balance.decimals)} {balance.unit}</span>
      </Text>
      {balance.unit === 'Dash' && (
        <FiatChip label={dashAmountToUsd(balance.amount, balance.decimals, rate)} hide={false} className='bg-dash-brand/10 px-2 py-[3px]' textClassName='!text-dash-brand' />
      )}
    </div>
  )
}

// Second row of the From card: identity picker, shielded unlock or the source balance.
export function SourceRow ({ draft, identities, onIdentityChange, balance, rate, shielded }: SourceRowProps): React.JSX.Element | null {
  if (draft.from.type === 'identity') {
    return (
      <div className='flex flex-col gap-2'>
        <IdentitySelect identities={identities} value={draft.from.identityId} onChange={onIdentityChange} size='lg' />
        <BalanceLine balance={balance} rate={rate} />
      </div>
    )
  }

  if (draft.from.type === 'shielded' && shielded.balance == null) {
    return (
      <PasswordGate
        description={SHIELDED_UNLOCK_DESCRIPTION}
        submitLabel='Unlock'
        pendingLabel='Unlocking...'
        isPending={shielded.isUnlocking}
        onSubmit={async (password) => await shielded.unlock(password)}
      />
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <BalanceLine balance={balance} rate={rate} />
      {draft.from.type === 'shielded' && shielded.isWarmingProver && (
        <Text size='xs' dim>Preparing private prover...</Text>
      )}
      <Banner variant='error' message={shielded.error} />
    </div>
  )
}
