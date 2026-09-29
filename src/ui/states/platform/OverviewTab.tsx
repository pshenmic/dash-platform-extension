import React from 'react'
import { CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { SeeAllTransactionsButton, TransactionsList } from '../../components/transactions'
import { StatCard, StatValue, StatValueSkeleton, TextSkeleton } from '../../components/common'
import { BigNumberDisplay } from '../../components/data'
import type { UseWalletPlatformDataResult } from '../../hooks'
import type { Identity } from '../../../types'
import { OVERVIEW_PREVIEW_LIMIT, type UsePlatformOverviewResult } from './usePlatformOverview'

// Shown instead of a number whenever the value is unknown, never a made-up one.
const PLACEHOLDER = '-'

interface OverviewTabProps {
  hide: boolean
  identities: Identity[]
  platformData: UseWalletPlatformDataResult
  overview: UsePlatformOverviewResult
  rate: number | null
}

export function OverviewTab ({ hide, identities, platformData, overview, rate }: OverviewTabProps): React.JSX.Element {
  const { operations, tokenCount, tokenCountLoading } = overview

  // A reload keeps the previous figures; only the first load has none to show.
  const platformKnown = !platformData.loading || platformData.identities.length > 0
  const platformRefreshing = platformData.loading && platformKnown

  const statValue = (value: number | null): string | number => {
    if (!platformKnown || value == null) return PLACEHOLDER
    return value
  }

  const handleRetry = (): void => {
    operations.retry()
  }

  return (
    <div className='flex flex-col gap-4'>
      <TransactionsList
        items={operations.items}
        loading={operations.loading}
        error={operations.error}
        rate={rate}
        hideAmounts={hide}
        groupByDate={false}
        limit={OVERVIEW_PREVIEW_LIMIT}
        onRetry={handleRetry}
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
          value={<StatValue value={identities.length} unit='Identities' />}
        />
        <StatCard
          icon={<CreditsIcon size={12} className='!text-dash-brand' />}
          label='Tokens'
          value={tokenCountLoading && tokenCount == null
            ? <StatValueSkeleton />
            : <StatValue value={tokenCount ?? PLACEHOLDER} unit='Tokens' loading={tokenCountLoading} />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {platformKnown
                ? <BigNumberDisplay unit='transfers'>{statValue(platformData.totalTransferCount)}</BigNumberDisplay>
                : <TextSkeleton className='w-6' />} transfers
            </Text>
          )}
          value={platformKnown
            ? <StatValue value={statValue(platformData.totalTxCount)} unit='TXs' loading={platformRefreshing} />
            : <StatValueSkeleton />}
        />
        <StatCard
          icon={<FingerprintIcon size={12} className='!text-dash-brand' />}
          label='Usernames'
          hint={platformData.lastName != null
            ? (
              <div className='flex items-center gap-1'>
                <div className='flex px-2 py-1 rounded-lg bg-[rgba(12,28,51,0.04)]'>
                  <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/64'>Last</Text>
                </div>
                <Text size='xs' weight='bold' className='!text-dash-primary-dark-blue/64'>
                  {platformData.lastName}
                </Text>
              </div>
              )
            : undefined}
          value={platformKnown
            ? <StatValue value={statValue(platformData.nameCount)} unit='Names' loading={platformRefreshing} />
            : <StatValueSkeleton />}
        />
      </div>
    </div>
  )
}
