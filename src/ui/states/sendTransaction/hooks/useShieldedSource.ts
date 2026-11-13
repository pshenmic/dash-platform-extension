import { useEffect, useMemo, useRef, useState } from 'react'
import { useExtensionAPI, useShieldedAddresses } from '../../../hooks'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import { maxShieldedSpendForValues, SHIELDED_SPEND_KINDS, toCreditsBigInt } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'

export interface UseShieldedSourceResult {
  balance: bigint | null
  hasLoaded: boolean
  isSyncing: boolean
  // New notes are in the pool, so the balance may have changed since the last sync.
  hasUpdates: boolean
  isWarmingProver: boolean
  error: string | null
  sync: (password: string) => Promise<string | null>
  spendEstimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>
}

// Shielded balance and spend estimates for the send wizard, from the last synced state.
export function useShieldedSource (enabled: boolean, network: NetworkType | null, walletId: string | null): UseShieldedSourceResult {
  const extensionAPI = useExtensionAPI()
  const shielded = useShieldedAddresses(network, walletId)
  const { refresh, unspentValues } = shielded
  const [isWarmingProver, setIsWarmingProver] = useState(false)
  const startedRef = useRef(false)

  // Re-checks spent notes and the pool size once the shielded source is picked.
  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true

    void refresh()

    setIsWarmingProver(true)
    extensionAPI.initShield()
      .catch(err => console.log('Shielded prover warm-up failed:', err))
      .finally(() => setIsWarmingProver(false))
  }, [enabled, refresh, extensionAPI])

  // Without an amount each estimate describes the largest spend: its amount, fee and notes.
  const spendEstimates = useMemo(() => Object.fromEntries(SHIELDED_SPEND_KINDS.map(spendType =>
    [spendType, maxShieldedSpendForValues(unspentValues, spendType)]
  )) as Record<ShieldedSpendKind, ShieldedSpendEstimate>, [unspentValues])

  return {
    balance: shielded.balance != null ? toCreditsBigInt(shielded.balance) : null,
    hasLoaded: shielded.hasLoaded,
    isSyncing: shielded.isSyncing,
    hasUpdates: shielded.hasUnscannedNotes,
    isWarmingProver,
    error: shielded.error,
    sync: shielded.sync,
    spendEstimates: shielded.hasLoaded ? spendEstimates : {}
  }
}
