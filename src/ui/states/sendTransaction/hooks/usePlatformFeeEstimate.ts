import { useEffect, useState } from 'react'
import { platformFallbackEstimate } from '../../../../utils'
import type { PlatformFeeEstimate, TransferApi } from '../transferApi'
import type { TransferMode } from '../types'
import { useEstimateGrace } from './useEstimateGrace'

interface PlatformFeeEstimateParams {
  api: TransferApi
  mode: TransferMode | null
  identityId: string | null
  sourceAddress: string | null
  // A change prices the estimate again, which also retries a failed one.
  balance: bigint | null
}

// Backend estimate, or the fallback while it is unknown; null when the mode has no estimate.
export interface PlatformFeeEstimateState {
  estimate: PlatformFeeEstimate | null
  isFallback: boolean
  // Request still inside its grace period.
  isLoading: boolean
}

interface Keyed {
  key: string
  // Null when the request failed.
  value: PlatformFeeEstimate | null
}

// Platform modes priced by a backend estimate instead of a static fee.
const ESTIMATED_MODES: TransferMode[] = ['send', 'withdraw', 'identityWithdraw']

// Whether the mode takes its fee and Max from a Platform estimate.
export const hasPlatformFeeEstimate = (mode: TransferMode | null): boolean =>
  mode != null && ESTIMATED_MODES.includes(mode)

// Request pricing the mode; null when it cannot be priced yet.
const estimateRequest = (api: TransferApi, mode: TransferMode | null, identityId: string | null, sourceAddress: string | null): (() => Promise<PlatformFeeEstimate>) | null => {
  const fromAddress = sourceAddress ?? undefined
  if (mode === 'send') return async () => await api.estimatePlatformTransfer(fromAddress)
  if (mode === 'withdraw') return async () => await api.estimateWithdrawalFee({ source: 'address', fromAddress })
  if (mode === 'identityWithdraw' && identityId != null) return async () => await api.estimateWithdrawalFee({ source: 'identity', identityId })
  return null
}

// Fee, Max and Min of a Platform address transfer or a withdrawal to Core.
export function usePlatformFeeEstimate ({ api, mode, identityId, sourceAddress, balance }: PlatformFeeEstimateParams): PlatformFeeEstimateState {
  const [estimate, setEstimate] = useState<Keyed | null>(null)
  const request = estimateRequest(api, mode, identityId, sourceAddress)
  const key = request != null ? JSON.stringify([mode, identityId, sourceAddress, balance?.toString() ?? null]) : null
  const settled = estimate != null && estimate.key === key ? estimate : null
  const isLoading = useEstimateGrace(key != null && settled == null ? key : null)

  // The fee does not depend on the amount, so it is priced once per source and balance.
  useEffect(() => {
    if (key == null || request == null) return
    let active = true
    request()
      .then(value => { if (active) setEstimate({ key, value }) })
      .catch(e => {
        console.log('platform fee estimate error', e)
        if (active) setEstimate({ key, value: null })
      })
    return () => { active = false }
  }, [api, key])

  const value = settled?.value ?? null
  return { estimate: value ?? platformFallbackEstimate(mode, balance), isFallback: value == null, isLoading }
}
