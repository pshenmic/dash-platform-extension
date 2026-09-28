import { useCallback, useEffect, useMemo } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { useAsyncState } from './useAsyncState'
import { toCoreTransactionRowItem } from '../components/transactions'
import type { TransactionRowItem } from '../components/transactions'
import type { NetworkType } from '../../types'

const NO_TRANSACTIONS: TransactionRowItem[] = []

export interface UseCoreTransactionsResult {
  transactions: TransactionRowItem[]
  loading: boolean
  error: string | null
  reload: () => void
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
  const [state, execute, , reset] = useAsyncState<TransactionRowItem[]>(null, { initialLoading: true })

  // The network and the wallet come from the current wallet in the content-script;
  // they stay in the deps so switching either refetches.
  const load = useCallback((keepData: boolean = false): void => {
    if (!enabled) {
      reset()
      return
    }

    void execute(async () => await extensionAPI.getCoreTransactions(limit)
      .then(response => response.transactions.map(toCoreTransactionRowItem)), { keepData })
  }, [extensionAPI, network, walletId, limit, enabled, execute, reset])

  useEffect(() => { load() }, [load])

  const reload = useCallback((): void => { load(true) }, [load])

  const transactions = state.data ?? NO_TRANSACTIONS
  const { loading, error } = state

  return useMemo(() => ({ transactions, loading, error, reload }), [transactions, loading, error, reload])
}
