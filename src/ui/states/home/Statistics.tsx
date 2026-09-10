import React from 'react'
import { DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { StatCard, StatValue } from '../../components/common'

interface StatisticsProps {
  identityCount: number
  /** Core transaction count, null while unknown. */
  coreTxCount: number | null
  /** Platform transaction count summed over the wallet identities, null while unknown. */
  platformTxCount: number | null
}

export function Statistics ({ identityCount, coreTxCount, platformTxCount }: StatisticsProps): React.JSX.Element {
  const totalTxCount = coreTxCount != null && platformTxCount != null ? coreTxCount + platformTxCount : null
  const hint = `${coreTxCount ?? '-'} Core - ${platformTxCount ?? '-'} Platform`

  return (
    <div className='flex flex-col gap-4'>
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        General Statistics
      </Text>
      <div className='flex items-center gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={hint}
          value={<StatValue value={totalTxCount ?? '-'} unit='TXs' />}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Identities'
          hint='In this wallet'
          value={<StatValue value={identityCount} unit='Identities' />}
        />
      </div>
    </div>
  )
}
