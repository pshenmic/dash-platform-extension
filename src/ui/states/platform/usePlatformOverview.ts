import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAsyncState, useInfiniteTransactions, usePlatformExplorerClient } from '../../hooks'
import type { InfiniteTransactionsState } from '../../hooks'
import { createIdentitySource } from '../transactions/sources/identitySource'
import { mergeSources } from '../transactions/sources/mergeSources'
import { transactionsSourceKey, type TransactionsSource } from '../transactions/types'
import type { Identity, NetworkType, TokenData } from '../../../types'
import { countHeldTokens } from '../../../utils'

export const OVERVIEW_PREVIEW_LIMIT = 3

export interface UsePlatformOverviewResult {
  operations: InfiniteTransactionsState
  tokenCount: number | null
  tokenCountLoading: boolean
  reload: () => void
}

/** Newest operations and held token count across the wallet identities. */
export function usePlatformOverview (identities: Identity[], network: NetworkType): UsePlatformOverviewResult {
  const platformExplorerClient = usePlatformExplorerClient()
  const [tokenCountState, executeTokenCount, , resetTokenCount] = useAsyncState<number | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const identifiers = identities.map(identity => identity.identifier).join(',')

  const source = useMemo((): TransactionsSource | null => {
    if (identifiers === '') return null

    const key = transactionsSourceKey({
      scope: 'platform',
      identityId: null,
      network,
      walletId: null,
      identifiers: identifiers.split(','),
      reloadCount
    })
    const sources = identifiers.split(',').map(identifier => createIdentitySource({
      client: platformExplorerClient,
      identifier,
      network,
      pageSize: OVERVIEW_PREVIEW_LIMIT
    }))

    return { ...mergeSources(key, sources, OVERVIEW_PREVIEW_LIMIT), key }
  }, [platformExplorerClient, identifiers, network, reloadCount])

  const operations = useInfiniteTransactions(source)

  // Distinct tokens with a positive balance across all identities.
  const loadTokenCount = useCallback((keepData: boolean = false): void => {
    if (identifiers === '') {
      resetTokenCount()
      return
    }

    const countTokens = async (): Promise<number | null> => {
      const lists = await Promise.all(identifiers.split(',').map(async identifier => await platformExplorerClient
        .fetchAllTokens(identifier, network)
        .catch(() => null)
      ))

      const known = lists.filter((list): list is TokenData[] => list != null)
      return known.length > 0 ? countHeldTokens(known) : null
    }

    void executeTokenCount(countTokens, { keepData })
  }, [platformExplorerClient, identifiers, network, executeTokenCount, resetTokenCount])

  useEffect(() => { loadTokenCount() }, [loadTokenCount])

  const reload = useCallback((): void => {
    setReloadCount(previous => previous + 1)
    loadTokenCount(true)
  }, [loadTokenCount])

  return { operations, tokenCount: tokenCountState.data, tokenCountLoading: tokenCountState.loading, reload }
}
