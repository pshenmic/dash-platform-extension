import { ESTIMATED_FEES } from '../../../constants'
import { TRANSFER_FEE_CREDITS } from '../../../../constants'
import { CORE_DASH_DECIMALS, coreMaxForOutputs, PLATFORM_DASH_DECIMALS, shieldedFallbackFee } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import type { DirectionConfig } from '../directions/directionConfig'
import type { TransferDraft } from '../types'
import type { CoreTransferEstimate } from './useCoreTransferEstimate'
import { hasPlatformFeeEstimate } from './usePlatformFeeEstimate'
import type { PlatformFeeEstimateState } from './usePlatformFeeEstimate'

// Network fee in base units of the layer that pays it: duffs on Core, credits on Platform.
export interface TransferFee {
  amount: bigint
  decimals: number
  // Fee comes out of the amount instead of on top of it.
  takenFromAmount?: boolean
  // Fallback with a safety margin while the estimate is unknown.
  isApproximate?: boolean
  // Estimate still loading; the fee shows as pending.
  isLoading?: boolean
}

interface TransferFeeParams {
  config: DirectionConfig | null
  draft: TransferDraft
  coreEstimate: CoreTransferEstimate
  platformEstimate: PlatformFeeEstimateState
  network: NetworkType
  shieldedSpendEstimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>
}

// Fee of every Platform direction that has no estimate, in credits.
const staticFee = (config: DirectionConfig, draft: TransferDraft, network: NetworkType): bigint => {
  switch (config.feeSource) {
    case 'identityEstimate':
      return draft.asset.type === 'token' ? ESTIMATED_FEES[network].tokens : ESTIMATED_FEES[network].credits
    default:
      return TRANSFER_FEE_CREDITS
  }
}

const SHIELDED_SPEND_TYPES: Partial<Record<string, ShieldedSpendKind>> = {
  unshield: 'unshield',
  shieldedTransfer: 'transfer',
  shieldedWithdraw: 'withdrawal'
}

// Largest amount a shielded spend can send after its fee; null when it does not apply or is unknown.
export const shieldedMaxAmount = (config: DirectionConfig | null, estimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>): bigint | null => {
  const spendType = config != null ? SHIELDED_SPEND_TYPES[config.mode] : undefined
  if (spendType == null) return null
  return estimates[spendType]?.amountCredits ?? null
}

// Outputs paid by the transfer: every Advanced recipient, or the one Simple recipient.
export const recipientCount = (draft: TransferDraft): number => draft.isAdvanced ? Math.max(draft.recipients.length, 1) : 1

// Largest Core amount to `recipients` outputs from the one-output send-max amount; null when the source is not Core or it is unknown.
export const coreMaxAmount = (config: DirectionConfig | null, recipients: number, maxAmountDuffs: bigint | null): bigint | null => {
  if (config?.feeSource !== 'coreEstimate' || maxAmountDuffs == null) return null
  return coreMaxForOutputs(maxAmountDuffs, recipients)
}

// Estimated network fee of the transfer, a fallback with a safety margin while the estimate is unknown; null while it cannot be priced.
export function useTransferFee ({ config, draft, coreEstimate, platformEstimate, network, shieldedSpendEstimates }: TransferFeeParams): TransferFee | null {
  if (config == null) return null
  if (config.feeSource === 'coreEstimate') {
    const { feeDuffs, isFeeFallback, isFeeLoading } = coreEstimate
    return feeDuffs != null ? { amount: feeDuffs, decimals: CORE_DASH_DECIMALS, isApproximate: isFeeFallback, isLoading: isFeeLoading } : null
  }
  if (hasPlatformFeeEstimate(config.mode)) {
    const { estimate, isFallback, isLoading } = platformEstimate
    return estimate != null ? { amount: estimate.feeCredits, decimals: PLATFORM_DASH_DECIMALS, takenFromAmount: estimate.feeTakenFromAmount, isApproximate: isFallback, isLoading } : null
  }

  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  if (spendType == null) return { amount: staticFee(config, draft, network), decimals: PLATFORM_DASH_DECIMALS }
  const estimate = shieldedSpendEstimates[spendType]?.feeCredits
  return { amount: estimate ?? shieldedFallbackFee(spendType), decimals: PLATFORM_DASH_DECIMALS, isApproximate: estimate == null }
}
