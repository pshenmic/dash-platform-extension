import { useCallback, useEffect, useRef } from 'react'
import { useAsyncState, usePlatformExplorerClient } from '../../hooks'
import { toTransactionRowItem } from '../../components/transactions'
import type { TransactionRowItem } from '../../components/transactions'
import { promisePool } from '../../../utils/promisePool'
import type { Identity, NetworkType, TransactionData } from '../../../types'

const IDENTITY_FETCH_CONCURRENCY = 4

export interface UseLastPlatformTransactionResult {
  transaction: TransactionRowItem | null
  loading: boolean
  reload: () => void
}

const timestampValue = (transaction: TransactionData): number => {
  const parsed = Date.parse(transaction.timestamp ?? '')
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Newest Platform transaction across the wallet identities. */
export function useLastPlatformTransaction (
  identities: Identity[],
  network?: NetworkType | null
): UseLastPlatformTransactionResult {
  const platformExplorerClient = usePlatformExplorerClient()
  const [state, execute, , reset] = useAsyncState<TransactionRowItem | null>(null)

  // The identity array is a new object every render, so the load keys off the
  // joined identifiers and reads the current list through a ref.
  const identifiers = identities.map(identity => identity.identifier).join(',')
  const identitiesRef = useRef(identities)
  identitiesRef.current = identities

  const load = useCallback((keepData: boolean = false): void => {
    const currentIdentities = identitiesRef.current

    if (currentIdentities.length === 0) {
      reset()
      return
    }

    const tasks = currentIdentities.map(identity => async (): Promise<TransactionData | null> => {
      const response = await platformExplorerClient
        .fetchTransactionsPage(identity.identifier, network ?? 'testnet', 1, 1, 'desc')
        .catch(() => null)

      return response?.resultSet?.[0] ?? null
    })

    void execute(async () => {
      const results = await promisePool(tasks, IDENTITY_FETCH_CONCURRENCY)

      const newest = results
        .filter((item): item is TransactionData => item != null)
        .sort((a, b) => timestampValue(b) - timestampValue(a))[0] ?? null

      return newest != null ? toTransactionRowItem(newest) : null
    }, { keepData })
  }, [platformExplorerClient, network, identifiers, execute, reset])

  useEffect(() => { load() }, [load])

  const reload = useCallback((): void => { load(true) }, [load])

  return { transaction: state.data, loading: state.loading, reload }
}
