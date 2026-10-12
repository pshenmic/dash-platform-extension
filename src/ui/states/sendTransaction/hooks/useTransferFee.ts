import { ESTIMATED_FEES } from '../../../constants'
import { CORE_FEE_PER_BYTE, CORE_P2PKH_OUTPUT_BYTES, SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import { CORE_DASH_DECIMALS, estimateCoreSendFee, maxCoreSendAmount, PLATFORM_DASH_DECIMALS } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import type { DirectionConfig } from '../directions/directionConfig'
import { CORE_TRANSFER_FEE_ESTIMATE_DUFFS } from '../constants'
import type { CoreUtxo, TransferDraft } from '../types'

// Network fee in base units of the layer that pays it: duffs on Core, credits on Platform.
export interface TransferFee {
  amount: bigint
  decimals: number
}

interface TransferFeeParams {
  config: DirectionConfig | null
  draft: TransferDraft
  amount: bigint | null
  utxos: CoreUtxo[] | null
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

const utxoAmounts = (utxos: CoreUtxo[]): bigint[] => utxos.map(utxo => BigInt(utxo.amountDuffs))

// Core fee in duffs for the inputs `sendCoreTransfer` would pick; the one-input estimate while the UTXOs or the amount are unknown.
const coreFee = (draft: TransferDraft, amount: bigint | null, utxos: CoreUtxo[] | null): bigint => {
  const recipients = recipientCount(draft)
  const fee = utxos != null && amount != null && amount > 0n ? estimateCoreSendFee(utxoAmounts(utxos), amount, recipients) : null
  return fee ?? CORE_TRANSFER_FEE_ESTIMATE_DUFFS + BigInt((recipients - 1) * CORE_P2PKH_OUTPUT_BYTES) * CORE_FEE_PER_BYTE
}

// Largest Core amount to `recipients` outputs: every wallet UTXO minus the fee; null when the source is not Core or the UTXOs are unknown.
export const coreMaxAmount = (config: DirectionConfig | null, recipients: number, utxos: CoreUtxo[] | null): bigint | null => {
  if (config?.feeSource !== 'coreEstimate' || utxos == null) return null
  return maxCoreSendAmount(utxoAmounts(utxos), recipients)
}

// Estimated network fee of the transfer; null while unknown.
export function useTransferFee ({ config, draft, amount, utxos, network, shieldedSpendEstimates }: TransferFeeParams): TransferFee | null {
  if (config == null) return null
  if (config.feeSource === 'coreEstimate') return { amount: coreFee(draft, amount, utxos), decimals: CORE_DASH_DECIMALS }

  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  const estimate = spendType != null ? shieldedSpendEstimates[spendType]?.feeCredits : undefined
  return { amount: estimate ?? staticFee(config, draft, network), decimals: PLATFORM_DASH_DECIMALS }
}
