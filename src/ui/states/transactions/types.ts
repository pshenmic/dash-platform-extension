import type { TransactionRowItem } from '../../components/transactions/TransactionRow'

export type TransactionsScope = 'all' | 'core' | 'platform' | 'identity'

export const TRANSACTIONS_PAGE_SIZE = 10

export interface TransactionsPage {
  items: TransactionRowItem[]
  hasMore: boolean
  // Upper bound, null while unknown.
  total: number | null
}

/** Stateful cursor yielding transactions in timestamp-desc order. */
export interface TransactionsSource {
  key: string
  loadMore: (signal: AbortSignal) => Promise<TransactionsPage>
}

// Missing or unparsable timestamps sort last instead of poisoning comparisons with NaN.
export function transactionSortKey (item: TransactionRowItem): number {
  if (item.timestamp == null || item.timestamp === '') return Number.NEGATIVE_INFINITY

  const parsed = Date.parse(item.timestamp)

  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}
