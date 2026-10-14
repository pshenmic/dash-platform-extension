import React from 'react'
import { Accordion, Button, Text } from 'dash-ui-kit/react'
import { ResultHeader } from '../../../components/layout/ResultHeader'
import { Banner, SummaryRow } from '../../../components/cards'
import { TransactionHashBlock } from '../../../components/transactions'
import { canShieldToOthers, dashAmountToUsd, formatDashAmount, getCoreTransactionExplorerUrl, isShieldToMyself } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import { CONTINUED_TRANSFER_MESSAGE, transferErrorMessage } from '../constants'
import { SENT_TO_SHIELDED_ADDRESS } from '../directions/directionConfig'
import type { DirectionConfig, HashType } from '../directions/directionConfig'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferFee } from '../hooks/useTransferFee'
import type { TransferHashes } from '../hooks/useTransferOperation'
import type { TransferDraft } from '../types'
import { TransferDetails } from './TransferDetails'

export type TransferOutcome =
  | { type: 'success', hashes: TransferHashes, fee?: TransferFee, continued?: boolean, credited?: TransferFee }
  | { type: 'error', message: string }

interface ResultStepProps {
  outcome: TransferOutcome
  draft: TransferDraft
  config: DirectionConfig
  amount: bigint
  balance: SourceBalance
  fee: TransferFee | null
  isPrepaid: boolean
  received: bigint | null
  rate: number | null
  network: NetworkType
  onDone: () => void
  onRetry: () => void
}

const HASH_LABELS: Record<HashType, string> = {
  single: 'Transaction Hash:',
  core: 'Core TX Hash:',
  platform: 'Platform TX Hash:'
}

const hashLabel = (hashType: HashType, draft: TransferDraft): string =>
  hashType === 'single' && draft.from.type === 'core' ? 'Transaction ID:' : HASH_LABELS[hashType]

// Final screen of the send wizard for a successful or failed transfer.
export function ResultStep ({ outcome, draft, config, amount, balance, fee, isPrepaid, received, rate, network, onDone, onRetry }: ResultStepProps): React.JSX.Element {
  const isSuccess = outcome.type === 'success'
  const actualFee = outcome.type === 'success' ? outcome.fee : undefined
  const credited = outcome.type === 'success' ? outcome.credited ?? null : null
  // Finished an earlier paid operation: its amount comes from the response, never from the draft.
  const continued = outcome.type === 'success' && outcome.continued === true
  const prepaid = actualFee == null && (isPrepaid || continued)
  const shown = continued ? credited : { amount, decimals: balance.decimals }
  const usd = draft.asset.type === 'dash' && shown != null ? dashAmountToUsd(shown.amount, shown.decimals, rate) : undefined
  const successMessage = canShieldToOthers(draft) && !isShieldToMyself(draft) ? SENT_TO_SHIELDED_ADDRESS : config.successMessage

  return (
    <div className='flex flex-col gap-6'>
      <ResultHeader
        status={outcome.type}
        amount={shown != null ? <><span className='font-bold'>{formatDashAmount(shown.amount, shown.decimals)}</span> {balance.unit}</> : <span className='font-bold'>Completed</span>}
        usd={usd}
        message={isSuccess ? successMessage : transferErrorMessage(balance.unit)}
      />

      <TransferDetails draft={draft} amount={amount} balance={balance} fee={actualFee ?? fee} feeExact={actualFee != null} received={continued ? null : received} credited={credited} rate={rate} prepaid={prepaid} />

      {continued && <Banner variant='info' message={CONTINUED_TRANSFER_MESSAGE} />}

      {outcome.type === 'success' && config.hashes.map(hashType => {
        const hash = outcome.hashes[hashType]
        const isCoreHash = hashType === 'core' || (hashType === 'single' && draft.from.type === 'core')
        return hash != null
          ? <TransactionHashBlock key={hashType} hash={hash} network={network} label={hashLabel(hashType, draft)} explorerUrl={isCoreHash ? getCoreTransactionExplorerUrl(hash, network) : undefined} />
          : <SummaryRow key={hashType} label={hashLabel(hashType, draft)} value='Pending' />
      })}

      {outcome.type === 'error' && (
        <Accordion title='Details'>
          <Text size='xs' className='break-words'>{outcome.message}</Text>
        </Accordion>
      )}

      <Button colorScheme='brand' size='xl' className='w-full' onClick={isSuccess ? onDone : onRetry}>
        {isSuccess ? 'Done' : 'Retry'}
      </Button>
    </div>
  )
}
