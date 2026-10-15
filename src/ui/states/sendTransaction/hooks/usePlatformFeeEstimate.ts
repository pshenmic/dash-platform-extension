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
  // Recipients paid by an address transfer; each one adds to its fee.
  outputCount: number
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

// Settled estimates by request key; null when the request failed.
type EstimateCache = Record<string, PlatformFeeEstimate | null>

// Platform modes priced by a backend estimate instead of a static fee.
const ESTIMATED_MODES: TransferMode[] = ['send', 'withdraw', 'identityWithdraw']

// Whether the mode takes its fee and Max from a Platform estimate.
export const hasPlatformFeeEstimate = (mode: TransferMode | null): boolean =>
  mode != null && ESTIMATED_MODES.includes(mode)

// Request pricing the mode; null when it cannot be priced yet.
const estimateRequest = (api: TransferApi, mode: TransferMode | null, identityId: string | null, sourceAddress: string | null, outputCount: number): (() => Promise<PlatformFeeEstimate>) | null => {
  const fromAddress = sourceAddress ?? undefined
  if (mode === 'send') return async () => await api.estimatePlatformTransfer(outputCount, fromAddress)
  if (mode === 'withdraw') return async () => await api.estimateWithdrawalFee({ source: 'address', fromAddress })
  if (mode === 'identityWithdraw' && identityId != null) return async () => await api.estimateWithdrawalFee({ source: 'identity', identityId })
  return null
}

// Fee, Max and Min of a Platform address transfer or a withdrawal to Core.
export function usePlatformFeeEstimate ({ api, mode, identityId, sourceAddress, outputCount, balance }: PlatformFeeEstimateParams): PlatformFeeEstimateState {
  const [cache, setCache] = useState<EstimateCache>({})
  const count = mode === 'send' ? Math.max(outputCount, 1) : 1
  const request = estimateRequest(api, mode, identityId, sourceAddress, count)
  const key = request != null ? JSON.stringify([mode, identityId, sourceAddress, count, balance?.toString() ?? null]) : null
  const isSettled = key != null && key in cache
  const isLoading = useEstimateGrace(key != null && !isSettled ? key : null)

  // The fee does not depend on the amount, so it is priced once per source, recipient count and balance.
  useEffect(() => {
    if (key == null || request == null || key in cache) return
    let active = true
    request()
      .then(value => { if (active) setCache(prev => ({ ...prev, [key]: value })) })
      .catch(e => {
        console.log('platform fee estimate error', e)
        if (active) setCache(prev => ({ ...prev, [key]: null }))
      })
    return () => { active = false }
  }, [api, key])

  const value = key != null ? cache[key] ?? null : null
  return { estimate: value ?? platformFallbackEstimate(mode, balance, count), isFallback: value == null, isLoading }
}
