import { useEffect, useState } from 'react'
import type { NetworkType } from '../../types'
import { fetchNames } from '../../utils'
import { getSdkPromise } from '../../utils/sdkLoader'
import { usePlatformExplorerClient } from './usePlatformExplorerApi'

/** First DPNS name of each identity, keyed by identifier; identities without a name are absent. */
export function useIdentityNames (identifiers: string[], network: NetworkType): Map<string, string> {
  const platformExplorerClient = usePlatformExplorerClient()
  const [namesById, setNamesById] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (identifiers.length === 0) {
      setNamesById(new Map())
      return
    }

    let cancelled = false

    // Awaited here rather than via useSdk, which would suspend the whole page.
    const load = async (): Promise<void> => {
      const sdk = await getSdkPromise()
      const entries = await Promise.all(identifiers.map(async (identifier) => {
        const names = await fetchNames(sdk, platformExplorerClient, identifier, network)
        const first = names[0]?.name
        return [identifier, first != null && first !== '' ? first : null] as const
      }))
      if (cancelled) return
      setNamesById(new Map(
        entries.filter((entry): entry is readonly [string, string] => entry[1] != null)
      ))
    }

    void load().catch(e => console.log('load identity names error', e))

    return () => {
      cancelled = true
    }
  }, [identifiers, network, platformExplorerClient])

  return namesById
}
