import React from 'react'
import { DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { DASHBOARD_MOCK } from './mock'
import { StatCard, StatValue } from '../../components/common'

interface StatisticsProps {
  identityCount: number
}

export function Statistics ({ identityCount }: StatisticsProps): React.JSX.Element {
  const count = identityCount > 0 ? identityCount : DASHBOARD_MOCK.identityCountFallback

  return (
    <div className='flex flex-col gap-4'>
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        General Statistics
      </Text>
      <div className='flex items-center gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={`${DASHBOARD_MOCK.txReceived} received - ${DASHBOARD_MOCK.txSent} sent`}
          value={<StatValue value={DASHBOARD_MOCK.txCount} unit='TXs' />}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Identities'
          hint='In this wallet'
          value={<StatValue value={count} unit='Identities' />}
        />
      </div>
    </div>
  )
}
