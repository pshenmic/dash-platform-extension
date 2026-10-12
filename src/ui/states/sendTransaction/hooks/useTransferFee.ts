import { ESTIMATED_FEES } from '../../../constants'
import { SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import { CORE_DASH_DECIMALS, coreMaxForOutputs, extraCoreOutputsFee, PLATFORM_DASH_DECIMALS } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import type { DirectionConfig } from '../directions/directionConfig'
import { CORE_TRANSFER_FEE_ESTIMATE_DUFFS } from '../constants'
import type { TransferDraft } from '../types'

// Network fee in base units of the layer that pays it: duffs on Core, credits on Platform.
export interface TransferFee {
  amount: bigint
  decimals: number
}

interface TransferFeeParams {
  config: DirectionConfig | null
  draft: TransferDraft
  coreFeeDuffs: bigint | null
  network: NetworkType
  shieldedSpendEstimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>
}

// Fee of every Platform source type that has no estimate, in credits.
const staticFee = (config: DirectionConfig, draft: TransferDraft, network: NetworkType): bigint => {
  const identityFee = draft.asset.type === 'token' ? ESTIMATED_FEES[network].tokens : ESTIMATED_FEES[network].credits

  switch (config.feeSource) {
    case 'identityEstimate':
      return identityFee
    case 'withdrawal':
      if (draft.from.type === 'identity') return identityFee
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
    case 'shieldedEstimate':
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
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

// Largest Core amount to `recipients` outputs from the send-max estimate; null when the source is not Core or it is unknown.
export const coreMaxAmount = (config: DirectionConfig | null, recipients: number, maxSendableDuffs: bigint | null): bigint | null => {
  if (config?.feeSource !== 'coreEstimate' || maxSendableDuffs == null) return null
  return coreMaxForOutputs(maxSendableDuffs, recipients)
}

// Estimated network fee of the transfer; null while unknown.
export function useTransferFee ({ config, draft, coreFeeDuffs, network, shieldedSpendEstimates }: TransferFeeParams): TransferFee | null {
  if (config == null) return null
  if (config.feeSource === 'coreEstimate') {
    return { amount: coreFeeDuffs ?? CORE_TRANSFER_FEE_ESTIMATE_DUFFS + extraCoreOutputsFee(recipientCount(draft)), decimals: CORE_DASH_DECIMALS }
  }

  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  const estimate = spendType != null ? shieldedSpendEstimates[spendType]?.feeCredits : undefined
  return { amount: estimate ?? staticFee(config, draft, network), decimals: PLATFORM_DASH_DECIMALS }
}
