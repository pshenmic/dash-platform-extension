import React, { useEffect, useMemo, useState } from 'react'
import { CreditsIcon, DocumentIcon, FingerprintIcon, Text } from 'dash-ui-kit/react'
import { LastTransaction } from '../home/LastTransaction'
import { SeeAllTransactionsButton, TransactionsList } from '../../components/transactions'
import { StatCard, StatValue } from '../../components/common'
import { useInfiniteTransactions, usePlatformExplorerClient } from '../../hooks'
import type { UseWalletPlatformDataResult } from '../../hooks'
import { createIdentitySource } from '../transactions/sources/identitySource'
import { mergeSources } from '../transactions/sources/mergeSources'
import type { TransactionsSource } from '../transactions/types'
import type { Identity, NetworkType } from '../../../types'
import { creditsToDashDisplay } from '../../../utils'

const OPERATIONS_LIMIT = 3
// Shown instead of a number whenever the value is unknown, never a made-up one.
const PLACEHOLDER = '-'

interface OverviewTabProps {
  hide: boolean
  identities: Identity[]
  network: NetworkType
  platformData: UseWalletPlatformDataResult
  rate: number | null
}

export function OverviewTab ({ hide, identities, network, platformData, rate }: OverviewTabProps): React.JSX.Element {
  const platformExplorerClient = usePlatformExplorerClient()
  const [tokenCount, setTokenCount] = useState<number | null>(null)

  const identifiers = identities.map(identity => identity.identifier).join(',')

  // Same explorer source as #/transactions, only the first page and 3 rows deep.
  const source = useMemo((): TransactionsSource | null => {
    if (identifiers === '') return null

    const key = `platform-overview|${network}|${identifiers}`
    const sources = identifiers.split(',').map(identifier => createIdentitySource({
      client: platformExplorerClient,
      identifier,
      network,
      pageSize: OPERATIONS_LIMIT
    }))

    return { ...mergeSources(key, sources, OPERATIONS_LIMIT), key }
  }, [platformExplorerClient, identifiers, network])

  const operations = useInfiniteTransactions(source)

  // Token counter comes from the pagination envelope, the list itself is unused here.
  useEffect(() => {
    let cancelled = false

    if (identifiers === '') {
      setTokenCount(null)
      return
    }

    const load = async (): Promise<void> => {
      const totals = await Promise.all(identifiers.split(',').map(async (identifier) => {
        const page = await platformExplorerClient
          .fetchTokensPage(identifier, network, 1, 1)
          .catch(() => null)

        return page?.pagination?.total ?? null
      }))

      if (cancelled) return

      const known = totals.filter((total): total is number => total != null)
      setTokenCount(known.length > 0 ? known.reduce((sum, total) => sum + total, 0) : null)
    }

    void load().catch(e => console.log('load tokens count error', e))

    return () => {
      cancelled = true
    }
  }, [platformExplorerClient, identifiers, network])

  const statValue = (value: number | null): React.ReactNode => {
    if (platformData.loading || value == null) return PLACEHOLDER
    return value
  }

  const lastOperation = operations.items[0] ?? null

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
        limit={OPERATIONS_LIMIT}
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
          value={<StatValue value={tokenCount ?? PLACEHOLDER} unit='Tokens' />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={(
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {statValue(platformData.totalTransferCount)} transfers
            </Text>
          )}
          value={<StatValue value={statValue(platformData.totalTxCount)} unit='TXs' />}
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
          value={<StatValue value={statValue(platformData.nameCount)} unit='Names' />}
        />
      </div>
      <LastTransaction
        hide={hide}
        loading={operations.loading}
        amountLabel={lastOperation?.amountLabel}
        amount={lastOperation != null ? creditsToDashDisplay(String(lastOperation.credits)) : undefined}
        hash={lastOperation?.hash ?? undefined}
        layer='Platform'
        transactionType={lastOperation?.title}
        emptyHint='No Platform transactions yet'
      />
    </div>
  )
}
