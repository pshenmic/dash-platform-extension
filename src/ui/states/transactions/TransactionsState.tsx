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
  all: 'All layers',
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

  const counter = useMemo(() => {
    if (items.length === 0) return SCOPE_LABELS[scope]
    // Merged streams drop cross-identity duplicates, so the total is an upper bound.
    if (total == null) return `${SCOPE_LABELS[scope]} - ${items.length} loaded`

    return `${SCOPE_LABELS[scope]} - ${items.length} of ~${total}`
  }, [items.length, scope, total])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <Heading as='h1' size='2xl'>Transactions</Heading>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
          {counter}
        </Text>
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
