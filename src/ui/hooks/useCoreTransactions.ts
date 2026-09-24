import { useEffect, useMemo, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { toCoreTransactionRowItem } from '../components/transactions'
import type { TransactionRowItem } from '../components/transactions'
import type { NetworkType } from '../../types'

export interface UseCoreTransactionsResult {
  transactions: TransactionRowItem[]
  loading: boolean
  error: string | null
}

/**
 * Newest Core (L1) transactions of the wallet, for previews. The explorer walks
 * the account xpub, so one page already covers every address of the wallet; the
 * full paginated list lives in the transactions screen.
 */
export function useCoreTransactions (
  limit: number,
  network?: NetworkType | null,
  walletId?: string | null,
  enabled: boolean = true
): UseCoreTransactionsResult {
  const extensionAPI = useExtensionAPI()
  const [transactions, setTransactions] = useState<TransactionRowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setTransactions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    extensionAPI.getCoreTransactions(limit)
      .then(response => {
        if (cancelled) return
        setTransactions(response.transactions.map(toCoreTransactionRowItem))
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
    // The network and the wallet come from the current wallet in the content-script;
    // they stay in the key so switching either refetches.
  }, [extensionAPI, network, walletId, limit, enabled])

  return useMemo(() => ({ transactions, loading, error }), [transactions, loading, error])
}
