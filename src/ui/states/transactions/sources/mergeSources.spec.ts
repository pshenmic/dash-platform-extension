import { mergeSources } from './mergeSources'
import type { TransactionRowItem } from '../../../components/transactions/TransactionRow'
import type { TransactionsPage, TransactionsSource } from '../types'

function row (id: string, timestamp: string | null, hash?: string): TransactionRowItem {
  return {
    id,
    title: 'Tx',
    detailLabel: 'Hash:',
    detailValue: id,
    credits: 1,
    fiatLabel: '',
    direction: 'neutral',
    hash: hash ?? id,
    timestamp
  }
}

// Source handing out fixed pages, one per loadMore call.
function pagedSource (key: string, pages: TransactionRowItem[][], total?: number): TransactionsSource {
  let index = 0

  return {
    key,
    async loadMore (): Promise<TransactionsPage> {
      const items = pages[index] ?? []
      index += 1

      return { items, hasMore: index < pages.length, total: total ?? null }
    }
  }
}

async function drain (source: TransactionsSource): Promise<TransactionRowItem[]> {
  const controller = new AbortController()
  const collected: TransactionRowItem[] = []
  let hasMore = true
  let guard = 0

  while (hasMore && guard < 50) {
    const page = await source.loadMore(controller.signal)
    collected.push(...page.items)
    hasMore = page.hasMore
    guard += 1
  }

  return collected
}

describe('mergeSources', () => {
  it('interleaves two streams in timestamp-desc order', async () => {
    const a = pagedSource('a', [[row('a1', '2026-09-09T10:00:00Z'), row('a2', '2026-09-07T10:00:00Z')]])
    const b = pagedSource('b', [[row('b1', '2026-09-08T10:00:00Z'), row('b2', '2026-09-06T10:00:00Z')]])

    const items = await drain(mergeSources('merged', [a, b], 10))

    expect(items.map(item => item.id)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  it('pulls a later page before emitting a newer item from another stream', async () => {
    const a = pagedSource('a', [
      [row('a1', '2026-09-09T10:00:00Z')],
      [row('a2', '2026-09-08T10:00:00Z')]
    ])
    const b = pagedSource('b', [[row('b1', '2026-09-01T10:00:00Z')]])

    const items = await drain(mergeSources('merged', [a, b], 10))

    expect(items.map(item => item.id)).toEqual(['a1', 'a2', 'b1'])
  })

  it('sorts null timestamps last instead of stalling the merge', async () => {
    const a = pagedSource('a', [[row('a1', null)]])
    const b = pagedSource('b', [[row('b1', '2026-09-08T10:00:00Z')]])

    const items = await drain(mergeSources('merged', [a, b], 10))

    expect(items.map(item => item.id)).toEqual(['b1', 'a1'])
  })

  it('drops a hash seen in another stream', async () => {
    const shared = '2026-09-08T10:00:00Z'
    const a = pagedSource('a', [[row('x', shared, 'samehash')]])
    const b = pagedSource('b', [[row('y', shared, 'samehash')]])

    const items = await drain(mergeSources('merged', [a, b], 10))

    expect(items).toHaveLength(1)
  })

  it('keeps going when one stream fails', async () => {
    const failing: TransactionsSource = {
      key: 'bad',
      loadMore: async () => await Promise.reject(new Error('boom'))
    }
    const ok = pagedSource('ok', [[row('o1', '2026-09-08T10:00:00Z')]])

    const items = await drain(mergeSources('merged', [failing, ok], 10))

    expect(items.map(item => item.id)).toEqual(['o1'])
  })

  it('handles an empty stream', async () => {
    const empty = pagedSource('empty', [[]])
    const ok = pagedSource('ok', [[row('o1', '2026-09-08T10:00:00Z')]])

    const items = await drain(mergeSources('merged', [empty, ok], 10))

    expect(items.map(item => item.id)).toEqual(['o1'])
  })

  it('sums known totals', async () => {
    const a = pagedSource('a', [[row('a1', '2026-09-09T10:00:00Z')]], 12)
    const b = pagedSource('b', [[row('b1', '2026-09-08T10:00:00Z')]], 8)
    const merged = mergeSources('merged', [a, b], 10)

    const page = await merged.loadMore(new AbortController().signal)

    expect(page.total).toBe(20)
  })
})
