import React from 'react'
import { Accordion, Button, Text } from 'dash-ui-kit/react'
import { ResultHeader } from '../../../components/layout/ResultHeader'
import { SummaryRow } from '../../../components/cards'
import { TransactionHashBlock } from '../../../components/transactions'
import { dashAmountToUsd, formatDashAmount, getCoreTransactionExplorerUrl } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import { transferErrorMessage } from '../constants'
import type { DirectionConfig, HashType } from '../directions/directionConfig'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferFee } from '../hooks/useTransferFee'
import type { TransferHashes } from '../hooks/useTransferOperation'
import type { TransferDraft } from '../types'
import { TransferDetails } from './TransferDetails'

export type TransferOutcome =
  | { type: 'success', hashes: TransferHashes, fee?: TransferFee }
  | { type: 'error', message: string }

interface ResultStepProps {
  outcome: TransferOutcome
  draft: TransferDraft
  config: DirectionConfig
  amount: bigint
  balance: SourceBalance
  fee: TransferFee | null
  received: bigint | null
  rate: number | null
  network: NetworkType
  onDone: () => void
  onRetry: () => void
}

const hashLabel = (hashType: HashType, draft: TransferDraft): string =>
  hashType === 'single' && draft.from.type === 'core' ? 'Transaction ID:' : HASH_LABELS[hashType]

const HASH_LABELS: Record<HashType, string> = {
  single: 'Transaction Hash:',
  core: 'Core TX Hash:',
  platform: 'Platform TX Hash:'
}

// Final screen of the send wizard for a successful or failed transfer.
export function ResultStep ({ outcome, draft, config, amount, balance, fee, received, rate, network, onDone, onRetry }: ResultStepProps): React.JSX.Element {
  const isSuccess = outcome.type === 'success'
  const usd = draft.asset.type === 'dash' ? dashAmountToUsd(amount, balance.decimals, rate) : undefined
  const actualFee = outcome.type === 'success' ? outcome.fee : undefined

  return (
    <div className='flex flex-col gap-6'>
      <ResultHeader
        status={outcome.type}
        amount={<><span className='font-bold'>{formatDashAmount(amount, balance.decimals)}</span> {balance.unit}</>}
        usd={usd}
        message={isSuccess ? config.successMessage : transferErrorMessage(balance.unit)}
      />

      <TransferDetails draft={draft} amount={amount} balance={balance} fee={actualFee ?? fee} feeExact={actualFee != null} received={received} rate={rate} />

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
