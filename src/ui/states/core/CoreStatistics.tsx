import React from 'react'
import { ChainSmallIcon, DocumentIcon, Text, TopRightArrowIcon } from 'dash-ui-kit/react'
import { CORE_MOCK } from './mock'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint: string
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
        <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
          {hint}
        </Text>
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

function DashValue ({ amount, hide }: { amount: string, hide: boolean }): React.JSX.Element {
  return (
    <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
      {hide ? '••••••' : amount}{' '}
      <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>Dash</Text>
    </Text>
  )
}

interface CoreStatisticsProps {
  hide: boolean
}

export function CoreStatistics ({ hide }: CoreStatisticsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4'>
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        Core Statistics
      </Text>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={`${CORE_MOCK.txReceived} received - ${CORE_MOCK.txSent} sent`}
          value={<CountValue count={CORE_MOCK.txCount} unit='TXs' />}
        />
        <StatCard
          icon={<ChainSmallIcon size={12} className='!text-dash-brand' />}
          label='Data Contracts'
          hint={`${CORE_MOCK.documentsCreated} Documents Created`}
          value={<CountValue count={CORE_MOCK.dataContractCount} unit='TXs' />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand' />}
          label='Total Sent'
          hint={`${CORE_MOCK.txSent} Transactions`}
          value={<DashValue amount={CORE_MOCK.totalSent} hide={hide} />}
        />
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand rotate-180' />}
          label='Total Received'
          hint={`${CORE_MOCK.txReceived} Transactions`}
          value={<DashValue amount={CORE_MOCK.totalReceived} hide={hide} />}
        />
      </div>
    </div>
  )
}
