import { useCallback, useEffect, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import type { GetCoreBalanceResponse } from '../../types/messages/response/GetCoreBalanceResponse'

export interface UseCoreBalanceResult {
  balance: GetCoreBalanceResponse | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Core (L1) wallet balance and totals. All amounts are duffs (10^8), as strings.
 * `enabled` is false for wallets with no Core layer, which have nothing to read.
 */
export function useCoreBalance (walletId?: string | null, enabled: boolean = true): UseCoreBalanceResult {
  const extensionAPI = useExtensionAPI()
  const [balance, setBalance] = useState<GetCoreBalanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setBalance(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    extensionAPI.getCoreBalance()
      .then(response => {
        if (cancelled) return
        setBalance(response)
        setLoading(false)
      })
      .catch((e: unknown) => {
        console.log('getCoreBalance error', e)
        if (cancelled) return
        setBalance(null)
        setError(e instanceof Error ? e.message : 'Failed to load Core balance')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [extensionAPI, walletId, epoch, enabled])

  const reload = useCallback((): void => {
    setEpoch(previous => previous + 1)
  }, [])

  return { balance, loading, error, reload }
}
