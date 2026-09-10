import { promisePool } from '../../../../utils/promisePool'
import type { TransactionRowItem } from '../../../components/transactions/TransactionRow'
import {
  TRANSACTIONS_PAGE_SIZE,
  transactionSortKey,
  type TransactionsSource
} from '../types'

const FETCH_CONCURRENCY = 5

interface BufferedItem {
  item: TransactionRowItem
  sortKey: number
}

interface CursorState {
  source: TransactionsSource
  buffer: BufferedItem[]
  hasMore: boolean
  failed: boolean
  total: number | null
}

function tailSortKey (cursor: CursorState): number {
  if (cursor.buffer.length === 0) return Number.POSITIVE_INFINITY

  return cursor.buffer[cursor.buffer.length - 1].sortKey
}

function sumTotals (cursors: CursorState[]): number | null {
  const known = cursors.filter(cursor => cursor.total != null)
  if (known.length === 0) return null

  return known.reduce((sum, cursor) => sum + (cursor.total ?? 0), 0)
}

/**
 * Merges several timestamp-desc sources into one.
 * A cursor may only emit its head once no unfetched item can still be newer.
 */
export function mergeSources (
  key: string,
  sources: TransactionsSource[],
  pageSize: number = TRANSACTIONS_PAGE_SIZE
): TransactionsSource {
  const cursors: CursorState[] = sources.map(source => ({
    source,
    buffer: [],
    hasMore: true,
    failed: false,
    total: null
  }))
  const seen = new Set<string>()

  const fetchInto = async (cursor: CursorState, signal: AbortSignal): Promise<void> => {
    const page = await cursor.source.loadMore(signal).catch((error) => {
      if (signal.aborted) throw error
      console.log('transactions source failed', cursor.source.key, error)
      cursor.failed = true
      return null
    })

    if (page == null) {
      cursor.hasMore = false
      return
    }

    cursor.total = page.total ?? cursor.total
    // An empty page ends the stream regardless of what the source claims.
    cursor.hasMore = page.hasMore && page.items.length > 0
    page.items.forEach(item => {
      cursor.buffer.push({ item, sortKey: transactionSortKey(item) })
    })
  }

  const primeEmpty = async (signal: AbortSignal): Promise<void> => {
    const pending = cursors.filter(cursor => cursor.buffer.length === 0 && cursor.hasMore && !cursor.failed)
    if (pending.length === 0) return

    await promisePool(pending.map(cursor => async () => { await fetchInto(cursor, signal) }), FETCH_CONCURRENCY)
  }

  return {
    key,
    async loadMore (signal: AbortSignal) {
      const items: TransactionRowItem[] = []

      while (items.length < pageSize) {
        await primeEmpty(signal)

        const buffered = cursors.filter(cursor => cursor.buffer.length > 0)
        if (buffered.length === 0) break

        const best = buffered.reduce((a, b) => (b.buffer[0].sortKey > a.buffer[0].sortKey ? b : a))
        const blocking = cursors.find(cursor =>
          cursor.hasMore && !cursor.failed && tailSortKey(cursor) > best.buffer[0].sortKey
        )

        if (blocking != null) {
          await fetchInto(blocking, signal)
          continue
        }

        const next = best.buffer.shift()
        if (next == null) continue

        const dedupeKey = next.item.hash != null && next.item.hash !== '' ? next.item.hash : next.item.id
        if (seen.has(dedupeKey)) continue

        seen.add(dedupeKey)
        items.push(next.item)
      }

      const hasMore = cursors.some(cursor =>
        cursor.buffer.length > 0 || (cursor.hasMore && !cursor.failed)
      )

      return { items, hasMore, total: sumTotals(cursors) }
    }
  }
}
