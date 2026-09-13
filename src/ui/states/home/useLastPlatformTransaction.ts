import { useEffect, useRef, useState } from 'react'
import { usePlatformExplorerClient } from '../../hooks'
import { toTransactionRowItem } from '../../components/transactions'
import type { TransactionRowItem } from '../../components/transactions'
import { promisePool } from '../../../utils/promisePool'
import type { Identity, NetworkType, TransactionData } from '../../../types'

const IDENTITY_FETCH_CONCURRENCY = 4

export interface UseLastPlatformTransactionResult {
  transaction: TransactionRowItem | null
  loading: boolean
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
  const [transaction, setTransaction] = useState<TransactionRowItem | null>(null)
  const [loading, setLoading] = useState(false)

  // The identity array is a new object every render, so the effect keys off the
  // joined identifiers and reads the current list through a ref.
  const identifiers = identities.map(identity => identity.identifier).join(',')
  const identitiesRef = useRef(identities)
  identitiesRef.current = identities

  useEffect(() => {
    let cancelled = false

    const currentIdentities = identitiesRef.current

    if (currentIdentities.length === 0) {
      setTransaction(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const tasks = currentIdentities.map(identity => async (): Promise<TransactionData | null> => {
      const response = await platformExplorerClient
        .fetchTransactionsPage(identity.identifier, network ?? 'testnet', 1, 1, 'desc')
        .catch(() => null)

      return response?.resultSet?.[0] ?? null
    })

    promisePool(tasks, IDENTITY_FETCH_CONCURRENCY)
      .then(results => {
        if (cancelled) return

        const newest = results
          .filter((item): item is TransactionData => item != null)
          .sort((a, b) => timestampValue(b) - timestampValue(a))[0] ?? null

        setTransaction(newest != null ? toTransactionRowItem(newest) : null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setTransaction(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [platformExplorerClient, network, identifiers])

  return { transaction, loading }
}
