import React from 'react'
import { ChainSmallIcon, DocumentIcon, Text, TopRightArrowIcon } from 'dash-ui-kit/react'
import { CORE_MOCK } from './mock'
import { StatCard, StatValue } from '../../components/common'

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
          value={<StatValue value={CORE_MOCK.txCount} unit='TXs' />}
        />
        <StatCard
          icon={<ChainSmallIcon size={12} className='!text-dash-brand' />}
          label='Data Contracts'
          hint={`${CORE_MOCK.documentsCreated} Documents Created`}
          value={<StatValue value={CORE_MOCK.dataContractCount} unit='TXs' />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand' />}
          label='Total Sent'
          hint={`${CORE_MOCK.txSent} Transactions`}
          value={<StatValue value={CORE_MOCK.totalSent} unit='Dash' hide={hide} />}
        />
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand rotate-180' />}
          label='Total Received'
          hint={`${CORE_MOCK.txReceived} Transactions`}
          value={<StatValue value={CORE_MOCK.totalReceived} unit='Dash' hide={hide} />}
        />
      </div>
    </div>
  )
}
