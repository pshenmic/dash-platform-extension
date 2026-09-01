import React from 'react'
import { DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { DASHBOARD_MOCK } from './mock'

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
          value={(
            <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
              {DASHBOARD_MOCK.txCount}{' '}
              <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>TXs</Text>
            </Text>
          )}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Identities'
          hint='In this wallet'
          value={(
            <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
              {count}{' '}
              <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>Identities</Text>
            </Text>
          )}
        />
      </div>
    </div>
  )
}
