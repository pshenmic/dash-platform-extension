import { useEffect, useState } from 'react'
import { useSdk } from '../../../hooks'
import type { Identity } from '../../../../types'

interface UseIdentityBalancesResult {
  identityBalances: Map<string, bigint>
  identityBalancesLoading: boolean
}

/**
 * Loads credit balances for the given identities (shown in the sender identity
 * selector). Skips loading entirely while `enabled` is false.
 */
export function useIdentityBalances (
  enabled: boolean,
  identities: Identity[]
): UseIdentityBalancesResult {
  const sdk = useSdk()
  const [identityBalances, setIdentityBalances] = useState<Map<string, bigint>>(new Map())
  const [identityBalancesLoading, setIdentityBalancesLoading] = useState(false)

  useEffect(() => {
    if (!enabled || identities.length === 0) return

    let cancelled = false
    const ids = identities.map(identity => identity.identifier)

    const load = async (): Promise<void> => {
      setIdentityBalancesLoading(true)
      const entries = await Promise.all(ids.map(async (id): Promise<[string, bigint] | null> => {
        try {
          return [id, await sdk.identities.getIdentityBalance(id)]
        } catch {
          return null
        }
      }))
      if (cancelled) return
      setIdentityBalances(new Map(entries.filter((entry): entry is [string, bigint] => entry != null)))
      setIdentityBalancesLoading(false)
    }

    void load().catch(e => console.log('loadIdentityBalances error:', e))

    return () => {
      cancelled = true
    }
  }, [enabled, identities, sdk])

  return { identityBalances, identityBalancesLoading }
}
