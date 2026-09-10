import type { TransactionRowItem } from '../../../components/transactions/TransactionRow'
import { TRANSACTIONS_PAGE_SIZE, type TransactionsSource } from '../types'

/** Paginated source over a fixed list. Stands in until a Core tx API exists. */
export function createMockSource (
  key: string,
  rows: TransactionRowItem[],
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
  delayMs: number = 250
): TransactionsSource {
  let offset = 0

  return {
    key,
    async loadMore () {
      const items = rows.slice(offset, offset + pageSize)
      offset += items.length

      if (delayMs > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, delayMs))
      }

      return { items, hasMore: offset < rows.length, total: rows.length }
    }
  }
}
