import type { PrivateAPIClient } from '../../../../types/PrivateAPIClient'
import { toCoreTransactionRowItem } from '../../../components/transactions'
import type { TransactionRowItem } from '../../../components/transactions'
import { TRANSACTIONS_PAGE_SIZE, type TransactionsSource } from '../types'

interface CoreSourceOptions {
  extensionAPI: PrivateAPIClient
  pageSize?: number
}

/**
 * Core transaction history for the whole wallet. The explorer lists it by the
 * account xpub of the current wallet, so a single cursor covers every address
 * the wallet derives and each row arrives with its direction already resolved.
 */
export function createCoreSource (
  key: string,
  { extensionAPI, pageSize = TRANSACTIONS_PAGE_SIZE }: CoreSourceOptions
): TransactionsSource {
  let cursor: string | undefined
  let hasMore = true

  return {
    key,
    async loadMore (signal: AbortSignal) {
      if (!hasMore) return { items: [], hasMore: false, total: null }

      // The call goes over extension messaging, which cannot be aborted; a stale
      // page is dropped instead.
      const page = await extensionAPI.getCoreTransactions(pageSize, cursor)

      if (signal.aborted) return { items: [], hasMore: true, total: null }

      cursor = page.nextCursor ?? undefined
      hasMore = page.nextCursor != null

      const items: TransactionRowItem[] = page.transactions.map(toCoreTransactionRowItem)

      // The explorer reports no count for an xpub.
      return { items, hasMore, total: null }
    }
  }
}
