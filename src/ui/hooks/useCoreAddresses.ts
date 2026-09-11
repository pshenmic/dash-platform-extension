import { useCallback, useEffect, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'

export interface UseCoreAddressesResult {
  /** Null until the list is known; an empty array means the wallet has no Core xpub. */
  addresses: string[] | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Core (L1) addresses of the current wallet: every used one on both chains plus
 * the next free one. The extent comes from the explorer's gap scan, so it also
 * covers addresses another install created on the same seed.
 */
export function useCoreAddresses (walletId?: string | null): UseCoreAddressesResult {
  const extensionAPI = useExtensionAPI()
  const [addresses, setAddresses] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    extensionAPI.listCoreAddresses()
      .then(entries => {
        if (cancelled) return
        setAddresses(entries.map(entry => entry.address))
        setLoading(false)
      })
      .catch((e: unknown) => {
        console.log('listCoreAddresses error', e)
        if (cancelled) return
        setAddresses(null)
        setError(e instanceof Error ? e.message : 'Failed to load Core addresses')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [extensionAPI, walletId, epoch])

  const reload = useCallback((): void => {
    setEpoch(previous => previous + 1)
  }, [])

  return { addresses, loading, error, reload }
}
