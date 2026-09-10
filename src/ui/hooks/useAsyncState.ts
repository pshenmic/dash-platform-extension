import { useState, useCallback, useRef, useEffect } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsyncState<T> (initialData: T | null = null): [
  AsyncState<T>,
  (asyncFn: () => Promise<T>) => Promise<void>,
  (data: T) => void,
  () => void
] {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
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

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    runIdRef.current += 1
    const runId = runIdRef.current
    const isStale = (): boolean => runId !== runIdRef.current || !mountedRef.current

    setState({ data: null, loading: true, error: null })

    try {
      const result = await asyncFn()
      if (isStale()) return
      setState({ data: result, loading: false, error: null })
    } catch (error) {
      if (isStale()) return
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
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
