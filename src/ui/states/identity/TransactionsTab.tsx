import React from 'react'
import { useParams } from 'react-router-dom'
import { Button, CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { LastTransaction } from '../home/LastTransaction'
import { TransactionsList, toTransactionRowItem, type TransactionRowItem } from '../../components/transactions'
import { useOpenTransactions } from '../../hooks'
import { creditsToDash, getTransactionExplorerUrl } from '../../../utils'
import type { NetworkType } from '../../../types'
import type { TransactionData } from '../../hooks/usePlatformExplorerApi'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}

function StatCard ({ icon, label, value, hint }: StatCardProps): React.JSX.Element {
  return (
    <div className='flex-1 min-w-0 flex flex-col justify-center gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0'>
          {icon}
        </div>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
          {label}
        </Text>
      </div>
      <div className='flex flex-col gap-2'>
        {value}
        {hint}
      </div>
    </div>
  )
}

function CountValue ({ count, unit }: { count: number, unit: string }): React.JSX.Element {
  return (
    <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
      {count}{' '}
      <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>{unit}</Text>
    </Text>
  )
}

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
  const openTransactions = useOpenTransactions('identity', identifier)
  const items: TransactionRowItem[] = transactions.map(tx => toTransactionRowItem(tx, rate))
  const received = items.filter(item => item.direction === 'in').length
  const sent = items.filter(item => item.direction === 'out').length
  const first = transactions[0]
  const firstItem = items[0]
  const lastDash = first != null ? creditsToDash(Number(first.gasUsed ?? 0)) : null
  const lastSigned = lastDash != null && firstItem != null
    ? `${firstItem.direction === 'out' ? '-' : firstItem.direction === 'in' ? '+' : ''}${lastDash.toFixed(3)}`
    : null

  return (
    <div className='flex flex-col gap-4'>
      <TransactionsList
        items={items}
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
          <Button
            type='button'
            colorScheme='lightBlue'
            className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
            onClick={openTransactions}
          >
            <Text size='sm' weight='medium' className='!text-dash-brand'>
              See All Transactions
            </Text>
          </Button>
        )}
      />
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        Identity Statistics
      </Text>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<CreditsIcon size={12} className='!text-dash-brand' />}
          label='Tokens'
          value={<CountValue count={tokenCount} unit='Tokens' />}
        />
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {received} received - {sent} sent
            </Text>
          )}
          value={<CountValue count={items.length} unit='TXs' />}
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
          value={<CountValue count={nameCount} unit='Names' />}
        />
      </div>
      {lastSigned != null && firstItem?.hash != null && (
        <LastTransaction
          hide={hide}
          amount={lastSigned}
          hash={firstItem.hash}
          layer='Platform'
          kind={firstItem.title}
        />
      )}
    </div>
  )
}
