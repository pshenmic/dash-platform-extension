import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { LastTransaction } from '../home/LastTransaction'
import { TransactionsList, type TransactionRowItem } from '../../components/transactions'
import { IDENTITY_MOCK } from './mock'

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
}

export function TransactionsTab ({ hide }: TransactionsTabProps): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='flex flex-col gap-4'>
      <TransactionsList
        items={IDENTITY_MOCK.operations.map((op): TransactionRowItem => ({ ...op }))}
        hideAmounts={hide}
        groupByDate
        limit={3}
        footer={(
          <Button
            type='button'
            colorScheme='lightBlue'
            className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
            onClick={() => { void navigate('/transactions') }}
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
          value={<CountValue count={IDENTITY_MOCK.tokenCount} unit='Tokens' />}
        />
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {IDENTITY_MOCK.txReceived} received - {IDENTITY_MOCK.txSent} sent
            </Text>
          )}
          value={<CountValue count={IDENTITY_MOCK.txCount} unit='TXs' />}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Usernames'
          hint={(
            <div className='flex items-center gap-1'>
              <div className='flex px-2 py-1 rounded-lg bg-[rgba(12,28,51,0.04)]'>
                <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/64'>Last</Text>
              </div>
              <Text size='xs' weight='bold' className='!text-dash-primary-dark-blue/64'>
                {IDENTITY_MOCK.lastName}
              </Text>
            </div>
          )}
          value={<CountValue count={IDENTITY_MOCK.nameCount} unit='Names' />}
        />
      </div>
      <LastTransaction
        hide={hide}
        amount={IDENTITY_MOCK.lastTxAmount}
        hash={IDENTITY_MOCK.lastTxHash}
        layer={IDENTITY_MOCK.lastTxLayer}
        kind={IDENTITY_MOCK.lastTxKind}
      />
    </div>
  )
}
