import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Heading, Text } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TransactionsFooter, TransactionsList } from '../../components/transactions'
import { useExtensionAPI, useInfiniteTransactions, usePlatformExplorerClient } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { getTransactionExplorerUrl } from '../../../utils'
import { parseTransactionsScope, transactionsPath } from '../../utils/transactionsPath'
import { ScopeSwitch } from './ScopeSwitch'
import { useTransactionsSource } from './useTransactionsSource'
import type { TransactionsScope } from './types'

const SCOPE_LABELS: Record<TransactionsScope, string> = {
  all: 'Core and Platform',
  core: 'Core',
  platform: 'Platform',
  identity: 'Identity'
}

/**
 * Wallet-wide transaction list. One screen for every dashboard, the layer it
 * shows comes from the scope in the URL.
 */
function TransactionsState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const client = usePlatformExplorerClient()
  const { availableIdentities, currentNetwork, currentWallet } = useOutletContext<OutletContext>()

  const scope = parseTransactionsScope(searchParams.get('scope'))
  const identityId = searchParams.get('id')
  const [hideBalance, setHideBalance] = useState(false)
  const rateRef = useRef<number | null>(null)

  useEffect(() => {
    extensionAPI.getSettings()
      .then(settings => { setHideBalance(settings.hideBalance) })
      .catch(e => console.log('getSettings error', e))
  }, [extensionAPI])

  useEffect(() => {
    if (currentNetwork == null) return

    client.fetchRate(currentNetwork)
      .then(rate => { rateRef.current = rate })
      .catch(e => console.log('fetchRate error', e))
  }, [client, currentNetwork])

  // A picked identity belongs to the wallet it was picked in, so switching
  // wallets widens the list back to the whole Platform layer.
  const previousWalletRef = useRef(currentWallet)

  useEffect(() => {
    const previous = previousWalletRef.current
    previousWalletRef.current = currentWallet

    if (previous === currentWallet || previous == null || currentWallet == null) return
    if (scope !== 'identity') return

    void navigate(transactionsPath('platform'), { replace: true, state: location.state })
  }, [currentWallet, scope, navigate, location.state])

  const source = useTransactionsSource({
    scope,
    identityId,
    identities: availableIdentities,
    network: currentNetwork,
    walletId: currentWallet,
    client,
    rateRef
  })

  const { items, total, loading, loadingMore, error, loadMoreError, hasMore, loadMore } =
    useInfiniteTransactions(source)

  const changeScope = useCallback((next: TransactionsScope): void => {
    // Keep the origin so the header back button still returns to the right dashboard.
    void navigate(transactionsPath(next), { replace: true, state: location.state })
  }, [navigate, location.state])

  const changeIdentity = useCallback((next: string | null): void => {
    const path = next == null ? transactionsPath('platform') : transactionsPath('identity', next)

    void navigate(path, { replace: true, state: location.state })
  }, [navigate, location.state])

  // Core has no API yet, so its rows are generated and must be called out.
  const includesCoreMock = scope === 'all' || scope === 'core'

  const counter = useMemo(() => {
    if (items.length === 0) return SCOPE_LABELS[scope]
    if (total == null) return `${SCOPE_LABELS[scope]} - ${items.length} loaded`

    // Merging several identity streams drops cross-identity duplicates, so the
    // summed total is an upper bound. A single stream counts exactly.
    const merged = (scope === 'all' || scope === 'platform') && availableIdentities.length > 1
    const approximate = merged ? '~' : ''

    return `${SCOPE_LABELS[scope]} - ${items.length} of ${approximate}${total} loaded`
  }, [items.length, scope, total, availableIdentities.length])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <Heading as='h1' size='2xl'>Transactions</Heading>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
          {counter}
        </Text>
        {includesCoreMock && (
          <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/35'>
            Core transactions are mock data
          </Text>
        )}
      </div>

      <ScopeSwitch
        scope={scope}
        identityId={identityId}
        identities={availableIdentities}
        onScopeChange={changeScope}
        onIdentityChange={changeIdentity}
      />

      <TransactionsList
        items={items}
        loading={loading && items.length === 0}
        error={items.length === 0 ? error : null}
        hideAmounts={hideBalance}
        groupByDate
        onItemClick={(item) => {
          if (currentNetwork != null && item.hash != null && item.hash !== '') {
            window.open(getTransactionExplorerUrl(item.hash, currentNetwork), '_blank')
          }
        }}
        footer={(
          <TransactionsFooter
            hasMore={hasMore}
            loadingMore={loadingMore}
            error={loadMoreError}
            onLoadMore={loadMore}
          />
        )}
      />
    </div>
  )
}

export default withAccessControl(TransactionsState, { requireWallet: true })
