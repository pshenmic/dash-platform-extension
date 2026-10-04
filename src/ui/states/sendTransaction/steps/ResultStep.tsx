import React from 'react'
import { Accordion, Button, Text } from 'dash-ui-kit/react'
import { ResultHeader } from '../../../components/layout/ResultHeader'
import { SummaryRow } from '../../../components/cards'
import { TransactionHashBlock } from '../../../components/transactions'
import { dashAmountToUsd, formatDashAmount } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import { transferErrorMessage } from '../constants'
import type { DirectionConfig, HashType } from '../directions/directionConfig'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferDraft } from '../types'
import { TransferDetails } from './TransferDetails'

export type TransferOutcome =
  | { type: 'success', txHash: string }
  | { type: 'error', message: string }

interface ResultStepProps {
  outcome: TransferOutcome
  draft: TransferDraft
  config: DirectionConfig
  amount: bigint
  balance: SourceBalance
  feeCredits: bigint | null
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

// Final screen of the send wizard for a successful or failed transfer.
export function ResultStep ({ outcome, draft, config, amount, balance, feeCredits, rate, network, onDone, onRetry }: ResultStepProps): React.JSX.Element {
  const isSuccess = outcome.type === 'success'
  const usd = draft.asset.type === 'dash' ? dashAmountToUsd(amount, balance.decimals, rate) : undefined

  return (
    <div className='flex flex-col gap-6'>
      <ResultHeader
        status={outcome.type}
        amount={<><span className='font-bold'>{formatDashAmount(amount, balance.decimals)}</span> {balance.unit}</>}
        usd={usd}
        message={isSuccess ? config.successMessage : transferErrorMessage(balance.unit)}
      />

      <TransferDetails draft={draft} amount={amount} balance={balance} feeCredits={feeCredits} rate={rate} />

      {outcome.type === 'success' && config.hashes.map(hashType => {
        const hash = hashType === 'core' ? null : outcome.txHash
        return hash != null
          ? <TransactionHashBlock key={hashType} hash={hash} network={network} label={HASH_LABELS[hashType]} />
          : <SummaryRow key={hashType} label={HASH_LABELS[hashType]} value='Pending' />
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
