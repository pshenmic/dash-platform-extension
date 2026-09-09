import { useCallback, useEffect, useRef, useState } from 'react'
import type { TransactionRowItem } from '../components/transactions/TransactionRow'
import type { TransactionsSource } from '../states/transactions/types'

export interface InfiniteTransactionsState {
  items: TransactionRowItem[]
  total: number | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  loadMoreError: string | null
  hasMore: boolean
  loadMore: () => void
}

function errorMessage (error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Accumulates pages from a source. Swapping the source resets everything
 * and aborts requests still in flight.
 */
export function useInfiniteTransactions (source: TransactionsSource | null): InfiniteTransactionsState {
  const [items, setItems] = useState<TransactionRowItem[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(source != null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const epochRef = useRef(0)
  const inFlightRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const sourceRef = useRef<TransactionsSource | null>(source)

  sourceRef.current = source

  const runLoad = useCallback((initial: boolean): void => {
    const active = sourceRef.current
    if (active == null || inFlightRef.current) return

    const epoch = epochRef.current
    const controller = new AbortController()
    abortRef.current = controller
    inFlightRef.current = true

    if (initial) setLoading(true)
    else setLoadingMore(true)

    setLoadMoreError(null)

    active.loadMore(controller.signal)
      .then(page => {
        if (epoch !== epochRef.current) return

        setItems(previous => [...previous, ...page.items])
        setTotal(page.total)
        setHasMore(page.hasMore)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (epoch !== epochRef.current || controller.signal.aborted) return

        if (initial) setError(errorMessage(loadError))
        else setLoadMoreError(errorMessage(loadError))
      })
      .finally(() => {
        if (epoch !== epochRef.current) return

        inFlightRef.current = false
        setLoading(false)
        setLoadingMore(false)
      })
  }, [])

  const sourceKey = source?.key ?? null

  useEffect(() => {
    epochRef.current += 1
    abortRef.current?.abort()
    inFlightRef.current = false

    setItems([])
    setTotal(null)
    setHasMore(false)
    setError(null)
    setLoadMoreError(null)
    setLoadingMore(false)
    setLoading(sourceKey != null)

    if (sourceKey != null) runLoad(true)

    return () => {
      epochRef.current += 1
      abortRef.current?.abort()
      inFlightRef.current = false
    }
  }, [sourceKey, runLoad])

  const loadMore = useCallback((): void => { runLoad(false) }, [runLoad])

  return { items, total, loading, loadingMore, error, loadMoreError, hasMore, loadMore }
}
