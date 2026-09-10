import React from 'react'
import { ExternalLinkIcon, Text, TopRightArrowIcon, Identifier } from 'dash-ui-kit/react'
import type { TransactionRowItem } from '../../components/transactions'
import { creditsToDashDisplay } from '../../../utils/bigintUtils'

interface LastTransactionProps {
  hide: boolean
  /** Shown while the transaction is still being fetched. */
  loading?: boolean
  /** Set when the figure is a fee rather than the amount transferred. */
  amountLabel?: string
  amount?: string
  hash?: string
  layer?: string
  transactionType?: string
  /** Replaces the default caption of the empty state. */
  emptyHint?: string
  /** Explorer row to render; the explicit fields below override whatever it carries. */
  transaction?: TransactionRowItem | null
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
  hide,
  loading = false,
  amountLabel,
  amount,
  hash,
  layer,
  transactionType,
  emptyHint,
  transaction
}: LastTransactionProps): React.JSX.Element {
  const resolvedAmount = amount ?? (transaction != null ? creditsToDashDisplay(String(transaction.credits)) : undefined)
  const resolvedHash = hash ?? transaction?.hash ?? undefined
  const resolvedType = transactionType ?? transaction?.title
  const resolvedAmountLabel = amountLabel ?? transaction?.amountLabel

  if (resolvedAmount == null || resolvedHash == null) {
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

  return (
    <div className='relative flex flex-col gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='absolute top-4 right-4 flex items-center gap-1.5'>
        {resolvedType != null && (
          <div className='flex px-3 py-1.5 rounded-full bg-[rgba(12,28,51,0.04)]'>
            <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-primary-dark-blue'>
              {resolvedType}
            </Text>
          </div>
        )}
        {layer != null && (
          <div className='flex px-3 py-1.5 rounded-full bg-[rgba(76,126,255,0.12)]'>
            <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-brand'>
              {layer}
            </Text>
          </div>
        )}
      </div>
      <Header />
      <div className='flex flex-col gap-2'>
        <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
          {resolvedAmountLabel != null && <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue/64'>{resolvedAmountLabel}{' '}</Text>}
          {hide ? '••••••' : resolvedAmount}{' '}
          <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>Dash</Text>
        </Text>
        <div className='flex items-center gap-1'>
          <Identifier highlight='both' ellipsis className='!text-[9px] font-bold'>
            {resolvedHash}
          </Identifier>
          <div className='p-0.5 rounded-[2px] bg-[rgba(12,28,51,0.05)]'>
            <ExternalLinkIcon size={8} className='!text-dash-primary-dark-blue/48' />
          </div>
        </div>
      </div>
    </div>
  )
}
