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

/** Newer of two rows, either of which may be missing. */
export function newerTransaction (
  first: TransactionRowItem | null,
  second: TransactionRowItem | null
): TransactionRowItem | null {
  if (first == null) return second
  if (second == null) return first

  return transactionSortKey(second) > transactionSortKey(first) ? second : first
}

interface SourceKeyParts {
  scope: TransactionsScope
  identityId: string | null
  network: string
  walletId: string | null
  identifiers: string[]
}

/**
 * Identity of a loaded page set. Anything that changes it must invalidate
 * everything already loaded, so the wallet belongs here even for a single
 * identity: the same identifier under another wallet is a different screen.
 */
export function transactionsSourceKey ({
  scope,
  identityId,
  network,
  walletId,
  identifiers
}: SourceKeyParts): string {
  return [network, walletId ?? '', scope, identityId ?? '', identifiers.join(',')].join('|')
}
