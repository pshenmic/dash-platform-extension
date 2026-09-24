import React from 'react'
import { ExternalLinkIcon, Text, TopRightArrowIcon, Identifier } from 'dash-ui-kit/react'
import type { TransactionRowItem } from '../../components/transactions'
import { StatCard } from '../../components/common'

interface LastTransactionProps {
  /** Shown while the transaction is still being fetched. */
  loading?: boolean
  hash?: string
  layer?: string
  transactionType?: string
  /** Explorer page opened by the button next to the type. */
  explorerUrl?: string | null
  /** Replaces the default caption of the empty state. */
  emptyHint?: string
  /** Explorer row to render; the explicit fields below override whatever it carries. */
  transaction?: TransactionRowItem | null
  /** Half-width tile matching the surrounding StatCard grid. */
  compact?: boolean
}

const DIRECTION_LABELS: Record<string, string> = {
  in: 'Receive',
  out: 'Send'
}

function Header (): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 pr-28'>
      <div className='w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0'>
        <TopRightArrowIcon size={10} className='!text-[#CD2E00]' />
      </div>
      <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
        Last Transaction
      </Text>
    </div>
  )
}

export function LastTransaction ({
  loading = false,
  hash,
  layer,
  transactionType,
  explorerUrl,
  emptyHint,
  transaction,
  compact = false
}: LastTransactionProps): React.JSX.Element {
  const resolvedHash = hash ?? transaction?.hash ?? undefined
  const resolvedType = transactionType ?? transaction?.title

  if (compact) {
    const directionLabel = transaction?.direction != null ? DIRECTION_LABELS[transaction.direction] : undefined

    return (
      <StatCard
        icon={<TopRightArrowIcon size={10} className='!text-[#CD2E00]' />}
        label='Last Transaction'
        value={(
          <Text className='!text-dash-brand !text-base !font-extrabold !leading-[1.2] break-words'>
            {resolvedType ?? '-'}
          </Text>
        )}
        hint={resolvedHash != null
          ? (
            <div className='flex items-center gap-1 min-w-0'>
              {directionLabel != null && (
                <div className='flex px-2 py-1 rounded-lg bg-[rgba(12,28,51,0.04)] shrink-0'>
                  <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/64'>{directionLabel}</Text>
                </div>
              )}
              <Identifier highlight='both' ellipsis className='!text-[9px] font-bold min-w-0'>
                {resolvedHash}
              </Identifier>
            </div>
            )
          : (loading ? 'Loading' : (emptyHint ?? 'No transactions yet'))}
      />
    )
  }

  if (resolvedHash == null || resolvedType == null) {
    return (
      <div className='flex flex-col gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
        <Header />
        <div className='flex flex-col gap-2'>
          <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>-</Text>
          <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
            {loading ? 'Loading' : (emptyHint ?? 'No transactions yet')}
          </Text>
        </div>
      </div>
    )
  }

  const hasExplorerUrl = explorerUrl != null && explorerUrl !== ''

  return (
    <div className='relative flex flex-col gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      {layer != null && (
        <div className='absolute top-4 right-4 flex px-3 py-1.5 rounded-full bg-[rgba(76,126,255,0.12)]'>
          <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-brand'>
            {layer}
          </Text>
        </div>
      )}
      <Header />
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <Text weight='bold' className='!text-dash-primary-dark-blue !text-base !leading-[1.2]'>
            {resolvedType}
          </Text>
          {hasExplorerUrl && (
            <a
              href={explorerUrl}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='View in explorer'
              className='p-1.5 rounded-lg bg-[rgba(12,28,51,0.05)] shrink-0 hover:bg-[rgba(12,28,51,0.1)]'
            >
              <ExternalLinkIcon size={14} className='!text-dash-primary-dark-blue/48' />
            </a>
          )}
        </div>
        <Identifier highlight='both' ellipsis className='!text-[9px] font-bold'>
          {resolvedHash}
        </Identifier>
      </div>
    </div>
  )
}
