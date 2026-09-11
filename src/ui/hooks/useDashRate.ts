import { useEffect, useState } from 'react'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import type { NetworkType } from '../../types'

/** Current DASH/USD rate. Shared so every screen does not fetch it on its own. */
export function useDashRate (network?: NetworkType | null): number | null {
  const platformExplorerClient = usePlatformExplorerClient()
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    platformExplorerClient.fetchRate(network ?? 'testnet')
      .then(value => {
        if (!cancelled) setRate(value)
      })
      .catch(e => console.log('fetchRate error', e))

    return () => {
      cancelled = true
    }
  }, [platformExplorerClient, network])

  return rate
}
