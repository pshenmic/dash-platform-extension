import { ESTIMATED_FEES } from '../../../constants'
import { CORE_FEE_PER_BYTE, CORE_P2PKH_INPUT_BYTES, CORE_P2PKH_OUTPUT_BYTES, CORE_TX_OVERHEAD_BYTES, SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import { computeShieldedSpendFee, CORE_DASH_DECIMALS, PLATFORM_DASH_DECIMALS } from '../../../../utils'
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

// Largest amount an automatic shielded spend can send after its fee; null when it does not apply or is unknown.
export const shieldedMaxAmount = (config: DirectionConfig | null, draft: TransferDraft, estimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>): bigint | null => {
  const spendType = config != null ? SHIELDED_SPEND_TYPES[config.mode] : undefined
  if (spendType == null || draft.coinControl.type !== 'automatic') return null
  return estimates[spendType]?.amountCredits ?? null
}

// Core fee in duffs: by transaction size when Coin Control picked the inputs, otherwise the estimate plus extra Advanced outputs.
const coreFee = (draft: TransferDraft): bigint => {
  const recipients = draft.isAdvanced ? Math.max(draft.recipients.length, 1) : 1

  if (draft.coinControl.type === 'utxo') {
    const bytes = CORE_TX_OVERHEAD_BYTES + draft.coinControl.inputs.length * CORE_P2PKH_INPUT_BYTES + (recipients + 1) * CORE_P2PKH_OUTPUT_BYTES
    return BigInt(bytes) * CORE_FEE_PER_BYTE
  }
  return CORE_TRANSFER_FEE_ESTIMATE_DUFFS + BigInt((recipients - 1) * CORE_P2PKH_OUTPUT_BYTES) * CORE_FEE_PER_BYTE
}

// Estimated network fee of the transfer; null while unknown.
export function useTransferFee ({ config, draft, network, shieldedSpendEstimates }: TransferFeeParams): TransferFee | null {
  if (config == null) return null
  if (config.feeSource === 'coreEstimate') return { amount: coreFee(draft), decimals: CORE_DASH_DECIMALS }

  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  if (spendType != null && draft.coinControl.type === 'shieldedNotes') {
    return { amount: computeShieldedSpendFee(spendType, draft.coinControl.noteIds.length), decimals: PLATFORM_DASH_DECIMALS }
  }
  const estimate = spendType != null ? shieldedSpendEstimates[spendType]?.feeCredits : undefined
  return { amount: estimate ?? staticFee(config, draft, network), decimals: PLATFORM_DASH_DECIMALS }
}
