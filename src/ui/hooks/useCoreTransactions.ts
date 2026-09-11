import { useEffect, useMemo, useState } from 'react'
import { useCoreAddresses } from './useCoreAddresses'
import { useCoreExplorerClient } from './useCoreExplorerClient'
import { toCoreTransactionRowItem } from '../components/transactions'
import type { TransactionRowItem } from '../components/transactions'
import { promisePool } from '../../utils/promisePool'
import type { CoreTransactionData, NetworkType } from '../../types'

const ADDRESS_FETCH_CONCURRENCY = 5

export interface UseCoreTransactionsResult {
  transactions: TransactionRowItem[]
  loading: boolean
  error: string | null
}

const timestampValue = (transaction: CoreTransactionData): number => {
  // Pending transactions carry no timestamp and belong on top - they are newer
  // than anything already in a block.
  if (transaction.timestamp == null) return Number.POSITIVE_INFINITY

  const parsed = Date.parse(transaction.timestamp)

  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Newest Core (L1) transactions of the wallet, for previews. dashscan indexes
 * per address, so this reads one page per wallet address and keeps the newest
 * `limit` of them; the full paginated list lives in the transactions screen.
 */
export function useCoreTransactions (
  limit: number,
  network?: NetworkType | null,
  walletId?: string | null
): UseCoreTransactionsResult {
  const coreClient = useCoreExplorerClient()
  const { addresses, loading: addressesLoading, error: addressesError } = useCoreAddresses(walletId)
  const [transactions, setTransactions] = useState<TransactionRowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const addressList = addresses?.join(',') ?? null

  useEffect(() => {
    let cancelled = false

    if (addressList == null) {
      setTransactions([])
      setLoading(addressesLoading)
      setError(addressesError)
      return
    }

    const ownedAddresses = addressList === '' ? [] : addressList.split(',')

    if (ownedAddresses.length === 0) {
      setTransactions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const owned = new Set(ownedAddresses)
    const tasks = ownedAddresses.map(address => async (): Promise<CoreTransactionData[]> => {
      const response = await coreClient
        .fetchAddressTransactionsPage(address, network ?? 'testnet', limit, 1, 'desc')
        .catch(() => null)

      return response?.resultSet ?? []
    })

    promisePool(tasks, ADDRESS_FETCH_CONCURRENCY)
      .then(results => {
        if (cancelled) return

        // The same transaction shows up under every wallet address it touches.
        const unique = new Map<string, CoreTransactionData>()
        results.flat().forEach(transaction => {
          unique.set(transaction.hash ?? `${unique.size}`, transaction)
        })

        const newest = [...unique.values()]
          .sort((a, b) => timestampValue(b) - timestampValue(a))
          .slice(0, limit)

        setTransactions(newest.map(transaction => toCoreTransactionRowItem(transaction, owned)))
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        console.log('core transactions error', e)
        setTransactions([])
        setError(e instanceof Error ? e.message : 'Failed to load Core transactions')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [coreClient, addressList, addressesLoading, addressesError, network, limit])

  return useMemo(() => ({ transactions, loading, error }), [transactions, loading, error])
}
