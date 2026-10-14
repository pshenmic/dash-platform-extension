import { CORE_FEE_PER_BYTE, CORE_P2PKH_INPUT_BYTES, CORE_P2PKH_OUTPUT_BYTES, CORE_TX_OVERHEAD_BYTES, MAX_WITHDRAWAL_CREDITS, MIN_WITHDRAWAL_CREDITS, SHIELDED_MAX_SPEND_NOTES } from '../constants'
import { CORE_FALLBACK_FEE_INPUTS, PLATFORM_TRANSFER_FALLBACK_FEE_CREDITS, PLATFORM_TRANSFER_FALLBACK_FEE_PER_OUTPUT_CREDITS, WITHDRAWAL_FALLBACK_FEE_CREDITS } from '../ui/constants/transaction'
import { computeShieldedSpendFee } from './shieldedFee'
import type { ShieldedSpendKind } from '../types/ShieldedSpendKind'
import type { PlatformFeeEstimate } from '../ui/states/sendTransaction/transferApi'
import type { TransferMode } from '../ui/states/sendTransaction/types'

const positive = (value: bigint): bigint => value > 0n ? value : 0n

// Fallback Core fee in duffs for `outputs` paid outputs plus change, spending CORE_FALLBACK_FEE_INPUTS coins.
export const coreFallbackFeeDuffs = (outputs: number): bigint => {
  const bytes = CORE_TX_OVERHEAD_BYTES + CORE_FALLBACK_FEE_INPUTS * CORE_P2PKH_INPUT_BYTES + (Math.max(outputs, 1) + 1) * CORE_P2PKH_OUTPUT_BYTES
  return BigInt(bytes) * CORE_FEE_PER_BYTE
}

// Fallback for the one-output send-max amount of a Core balance.
export const coreFallbackMaxDuffs = (balance: bigint): bigint => positive(balance - coreFallbackFeeDuffs(1))

// Fallback fee in credits of an address transfer paying `outputs` recipients.
export const platformFallbackFeeCredits = (outputs: number): bigint =>
  PLATFORM_TRANSFER_FALLBACK_FEE_CREDITS + BigInt(Math.max(outputs, 1) - 1) * PLATFORM_TRANSFER_FALLBACK_FEE_PER_OUTPUT_CREDITS

// Fallback estimate of a Platform-priced mode, shaped like the backend one; null for other modes or an unknown balance.
export const platformFallbackEstimate = (mode: TransferMode | null, balance: bigint | null, outputs: number = 1): PlatformFeeEstimate | null => {
  if (balance == null) return null
  if (mode === 'send') {
    const feeCredits = platformFallbackFeeCredits(outputs)
    return { feeCredits, maxAmountCredits: positive(balance - feeCredits), minAmountCredits: null, feeTakenFromAmount: false }
  }
  if (mode !== 'withdraw' && mode !== 'identityWithdraw') return null

  const feeCredits = WITHDRAWAL_FALLBACK_FEE_CREDITS
  const spendable = positive(balance - feeCredits)
  const maxAmountCredits = spendable > MAX_WITHDRAWAL_CREDITS ? MAX_WITHDRAWAL_CREDITS : spendable
  // An address withdrawal pays the fee out of the amount, so less than the fee gets nothing across.
  return mode === 'withdraw'
    ? { feeCredits, maxAmountCredits, minAmountCredits: feeCredits + MIN_WITHDRAWAL_CREDITS, feeTakenFromAmount: true }
    : { feeCredits, maxAmountCredits, minAmountCredits: MIN_WITHDRAWAL_CREDITS, feeTakenFromAmount: false }
}

// Fallback shielded spend fee: the most one spend can cost, at the note cap.
export const shieldedFallbackFee = (spendType: ShieldedSpendKind): bigint => computeShieldedSpendFee(spendType, SHIELDED_MAX_SPEND_NOTES)

// Fee to show: null while its estimate is still loading.
export const shownFee = <T extends { isLoading?: boolean }>(fee: T | null): T | null => fee?.isLoading === true ? null : fee
