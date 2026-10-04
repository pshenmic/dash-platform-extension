import { useCallback, useEffect } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { useAsyncState } from './useAsyncState'
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
  const [state, execute, , reset] = useAsyncState<GetCoreBalanceResponse>(null, { initialLoading: true })

  // The wallet comes from the content-script; it stays in the deps so switching refetches.
  const load = useCallback((keepData: boolean = false): void => {
    if (!enabled) {
      reset()
      return
    }

    void execute(async () => await extensionAPI.getCoreBalance(), { keepData })
  }, [extensionAPI, walletId, enabled, execute, reset])

  useEffect(() => { load() }, [load])

  const reload = useCallback((): void => { load(true) }, [load])

  return { balance: state.data, loading: state.loading, error: state.error, reload }
}
