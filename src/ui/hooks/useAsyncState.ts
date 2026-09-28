import { useState, useCallback, useRef, useEffect } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface AsyncStateOptions {
  /** Report loading before the first run starts. */
  initialLoading?: boolean
}

export interface ExecuteOptions {
  /** Keep the previous data while loading and on error. */
  keepData?: boolean
}

export type ExecuteAsync<T> = (asyncFn: () => Promise<T>, options?: ExecuteOptions) => Promise<void>

export function useAsyncState<T> (initialData: T | null = null, options: AsyncStateOptions = {}): [
  AsyncState<T>,
  ExecuteAsync<T>,
  (data: T) => void,
  () => void
] {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: options.initialLoading === true,
    error: null
  })

  // Only the newest run may write. Without this a slow response for a previous
  // argument (say the identity you just switched away from) lands last and
  // overwrites the current one.
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * Runs asyncFn and stores its result. Pass keepData only when refreshing the same subject; a new subject must clear.
   */
  const execute = useCallback<ExecuteAsync<T>>(async (asyncFn, executeOptions = {}) => {
    runIdRef.current += 1
    const runId = runIdRef.current
    const isStale = (): boolean => runId !== runIdRef.current || !mountedRef.current
    const keepData = executeOptions.keepData === true

    setState(previous => ({ data: keepData ? previous.data : null, loading: true, error: null }))

    try {
      const result = await asyncFn()
      if (isStale()) return
      setState({ data: result, loading: false, error: null })
    } catch (error) {
      console.log('useAsyncState error', error)
      if (isStale()) return
      const message = error instanceof Error ? error.message : 'Unknown error'
      setState(previous => ({ data: keepData ? previous.data : null, loading: false, error: message }))
    }
  }, [])

  const setData = useCallback((data: T) => {
    runIdRef.current += 1
    setState({ data, loading: false, error: null })
  }, [])

  const reset = useCallback(() => {
    runIdRef.current += 1
    setState({ data: initialData, loading: false, error: null })
  }, [initialData])

  return [state, execute, setData, reset]
}
