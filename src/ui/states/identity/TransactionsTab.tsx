import React from 'react'
import { useParams } from 'react-router-dom'
import { CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { LastTransaction } from '../home/LastTransaction'
import { SeeAllTransactionsButton, TransactionsList, toTransactionRowItem, type TransactionRowItem } from '../../components/transactions'
import { creditsToDash, getTransactionExplorerUrl } from '../../../utils'
import type { NetworkType } from '../../../types'
import type { TransactionData } from '../../hooks/usePlatformExplorerApi'
import { StatCard, StatValue } from '../../components/common'

interface TransactionsTabProps {
  hide: boolean
  loading: boolean
  error: string | null
  transactions: TransactionData[]
  rate: number | null
  network: NetworkType
  tokenCount: number
  nameCount: number
  lastName: string | null
}

export function TransactionsTab ({
  hide,
  loading,
  error,
  transactions,
  rate,
  network,
  tokenCount,
  nameCount,
  lastName
}: TransactionsTabProps): React.JSX.Element {
  const { identifier } = useParams<{ identifier: string }>()
  const items: TransactionRowItem[] = transactions.map(tx => toTransactionRowItem(tx))
  const received = items.filter(item => item.direction === 'in').length
  const sent = items.filter(item => item.direction === 'out').length
  const first = transactions[0]
  const firstItem = items[0]
  // gasUsed is the fee, not the amount sent, so it carries no direction sign.
  const lastFeeDash = first != null ? creditsToDash(Number(first.gasUsed ?? 0)) : null

  return (
    <div className='flex flex-col gap-4'>
      <TransactionsList
        items={items}
        rate={rate}
        loading={loading}
        error={error}
        hideAmounts={hide}
        groupByDate
        limit={3}
        onItemClick={(item) => {
          if (item.hash != null && item.hash !== '') {
            window.open(getTransactionExplorerUrl(item.hash, network), '_blank')
          }
        }}
        footer={(
          <SeeAllTransactionsButton scope='identity' identityId={identifier} />
        )}
      />
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        Identity Statistics
      </Text>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<CreditsIcon size={12} className='!text-dash-brand' />}
          label='Tokens'
          value={<StatValue value={tokenCount} unit='Tokens' />}
        />
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {received} received - {sent} sent
            </Text>
          )}
          value={<StatValue value={items.length} unit='TXs' />}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Usernames'
          hint={lastName != null && lastName !== ''
            ? (
              <div className='flex items-center gap-1'>
                <div className='flex px-2 py-1 rounded-lg bg-[rgba(12,28,51,0.04)]'>
                  <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/64'>Last</Text>
                </div>
                <Text size='xs' weight='bold' className='!text-dash-primary-dark-blue/64'>
                  {lastName}
                </Text>
              </div>
              )
            : undefined}
          value={<StatValue value={nameCount} unit='Names' />}
        />
      </div>
      {lastFeeDash != null && firstItem?.hash != null && (
        <LastTransaction
          hide={hide}
          amount={lastFeeDash.toFixed(3)}
          amountLabel='Fee:'
          hash={firstItem.hash}
          layer='Platform'
          transactionType={firstItem.title}
        />
      )}
    </div>
  )
}
