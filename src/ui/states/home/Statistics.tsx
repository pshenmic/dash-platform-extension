import React from 'react'
import { DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { InlineSpinner, StatCard, StatValue } from '../../components/common'

interface StatisticsProps {
  identityCount: number
  /** Core transaction count, null until it loads. */
  coreTxCount: number | null
  /** Platform transaction count summed over the wallet identities, null until it loads. */
  platformTxCount: number | null
  coreLoading: boolean
  platformLoading: boolean
}

export function Statistics ({
  identityCount,
  coreTxCount,
  platformTxCount,
  coreLoading,
  platformLoading
}: StatisticsProps): React.JSX.Element {
  const loading = coreLoading || platformLoading
  // Counts the parts that already loaded, so the number grows instead of staying a dash.
  const loadedTxCount = coreTxCount != null || platformTxCount != null
    ? (coreTxCount ?? 0) + (platformTxCount ?? 0)
    : null

  const txValue = loadedTxCount == null && loading
    ? <InlineSpinner className='w-6 h-6 text-dash-brand' />
    : (
      <span className='inline-flex items-center gap-2'>
        <StatValue value={loadedTxCount ?? '-'} unit='TXs' />
        {loading && <InlineSpinner className='w-4 h-4 text-dash-brand' />}
      </span>
      )

  const hint = (
    <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
      {coreLoading ? '...' : (coreTxCount ?? '-')} Core - {platformLoading ? '...' : (platformTxCount ?? '-')} Platform
    </Text>
  )

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
          value={txValue}
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
