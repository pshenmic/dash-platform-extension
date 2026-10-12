import { useCallback, useEffect } from 'react'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import { useAsyncState } from './useAsyncState'
import type { NetworkType } from '../../types'

export interface UseDashRateResult {
  rate: number | null
  reload: () => void
}

/** Current DASH/USD rate. Shared so every screen does not fetch it on its own. */
export function useDashRate (network?: NetworkType | null): UseDashRateResult {
  const platformExplorerClient = usePlatformExplorerClient()
  const [state, execute] = useAsyncState<number>(null)

  const load = useCallback((keepData: boolean = false): void => {
    void execute(async () => await platformExplorerClient.fetchRate(network ?? 'testnet'), { keepData })
  }, [platformExplorerClient, network, execute])

  useEffect(() => { load() }, [load])

  const reload = useCallback((): void => { load(true) }, [load])

  return { rate: state.data, reload }
}
