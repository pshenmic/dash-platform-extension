import React from 'react'
import { CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { LastTransaction } from '../home/LastTransaction'
import { SeeAllTransactionsButton, TransactionsList, type TransactionRowItem } from '../../components/transactions'
import { PLATFORM_MOCK } from './mock'
import { StatCard, StatValue } from '../../components/common'

interface OverviewTabProps {
  hide: boolean
  identityCount: number
}

export function OverviewTab ({ hide, identityCount }: OverviewTabProps): React.JSX.Element {
  const identities = identityCount > 0 ? identityCount : PLATFORM_MOCK.identityCountFallback

  return (
    <div className='flex flex-col gap-4'>
      <TransactionsList
        items={PLATFORM_MOCK.operations.map((op): TransactionRowItem => ({ ...op }))}
        hideAmounts={hide}
        groupByDate={false}
        limit={3}
        footer={(
          <SeeAllTransactionsButton scope='platform' />
        )}
      />
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        Platform Statistics
      </Text>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Identities'
          value={<StatValue value={identities} unit='Identities' />}
        />
        <StatCard
          icon={<CreditsIcon size={12} className='!text-dash-brand' />}
          label='Tokens'
          value={<StatValue value={PLATFORM_MOCK.tokenCount} unit='Tokens' />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {PLATFORM_MOCK.txReceived} received - {PLATFORM_MOCK.txSent} sent
            </Text>
          )}
          value={<StatValue value={PLATFORM_MOCK.txCount} unit='TXs' />}
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
                {PLATFORM_MOCK.lastName}
              </Text>
            </div>
          )}
          value={<StatValue value={PLATFORM_MOCK.nameCount} unit='Names' />}
        />
      </div>
      <LastTransaction
        hide={hide}
        amount={PLATFORM_MOCK.lastTxAmount}
        hash={PLATFORM_MOCK.lastTxHash}
        layer={PLATFORM_MOCK.lastTxLayer}
        transactionType={PLATFORM_MOCK.lastTxType}
      />
    </div>
  )
}
