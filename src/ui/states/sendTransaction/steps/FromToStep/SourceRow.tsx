import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { Banner } from '../../../../components/cards'
import { ShieldedSyncStatus } from '../../../../components/addresses'
import type { UseShieldedSourceResult } from '../../hooks/useShieldedSource'
import type { SourceIdentity, TransferDraft } from '../../types'
import type { SourceBalance } from '../../hooks/useSourceBalance'
import { SourceIdentitySelect } from './SourceIdentitySelect'
import { SourceBalanceLabel } from './SourceBalanceLabel'

interface SourceRowProps {
  draft: TransferDraft
  identities: SourceIdentity[]
  onIdentityChange: (identityId: string) => void
  balance: SourceBalance
  rate: number | null
  shielded: UseShieldedSourceResult
}

// Second row of the From card: identity picker, shielded sync or the source balance.
export function SourceRow ({ draft, identities, onIdentityChange, balance, rate, shielded }: SourceRowProps): React.JSX.Element | null {
  if (draft.from.type === 'identity') {
    return (
      <SourceIdentitySelect identities={identities} value={draft.from.identityId} onChange={onIdentityChange} balance={balance} rate={rate} />
    )
  }

  const isShielded = draft.from.type === 'shielded'
  const balanceLabel = <SourceBalanceLabel balance={balance} rate={rate} />

  return (
    <div className='flex flex-col gap-2'>
      {isShielded
        ? (
          <ShieldedSyncStatus
            hasLoaded={shielded.hasLoaded}
            isSyncing={shielded.isSyncing}
            hasUpdates={shielded.hasUpdates}
            label={balanceLabel}
            onSync={async (password) => await shielded.sync(password)}
          />
          )
        : balanceLabel}
      {isShielded && shielded.isWarmingProver && (
        <Text size='xs' dim>Preparing private prover...</Text>
      )}
      {isShielded && <Banner variant='error' message={shielded.error} />}
    </div>
  )
}
