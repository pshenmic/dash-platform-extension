import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { PasswordGate } from '../../../../components/forms'
import { Banner } from '../../../../components/cards'
import { AssetBalanceLabel } from '../../../../components/data'
import { dashAmountToUsd, formatDashAmount } from '../../../../../utils'
import { SHIELDED_UNLOCK_DESCRIPTION } from '../../constants'
import type { SourceIdentity, TransferDraft } from '../../types'
import type { SourceBalance } from '../../hooks/useSourceBalance'
import { SourceIdentitySelect } from './SourceIdentitySelect'

interface ShieldedState {
  balance: bigint | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  unlock: (password: string) => Promise<string | null>
}

interface SourceRowProps {
  draft: TransferDraft
  identities: SourceIdentity[]
  onIdentityChange: (identityId: string) => void
  balance: SourceBalance
  rate: number | null
  shielded: ShieldedState
}

// Second row of the From card: identity picker, shielded unlock or the source balance.
export function SourceRow ({ draft, identities, onIdentityChange, balance, rate, shielded }: SourceRowProps): React.JSX.Element | null {
  if (draft.from.type === 'identity') {
    return (
      <SourceIdentitySelect identities={identities} value={draft.from.identityId} onChange={onIdentityChange} balance={balance} rate={rate} />
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
      {balance.amount != null && (
        <AssetBalanceLabel
          balance={formatDashAmount(balance.amount, balance.decimals)}
          unit={balance.unit}
          usdValue={balance.unit === 'Dash' ? dashAmountToUsd(balance.amount, balance.decimals, rate) : null}
        />
      )}
      {draft.from.type === 'shielded' && shielded.isWarmingProver && (
        <Text size='xs' dim>Preparing private prover...</Text>
      )}
      <Banner variant='error' message={shielded.error} />
    </div>
  )
}
