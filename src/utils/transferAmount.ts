import { fromBaseUnit, toBaseUnit } from './bigintUtils'
import { computeShieldedDepositFee } from './shieldedFee'
import { CORE_DUST_THRESHOLD, CREDITS_PER_DUFF, MAX_WITHDRAWAL_CREDITS, MIN_FEE_RELAY, MIN_OUTPUT_CREDITS, MIN_TOPUP_FUNDING_DUFFS, MIN_WITHDRAWAL_CREDITS } from '../constants'
import { MIN_CREDIT_TRANSFER } from '../ui/constants/transaction'
import type { EndpointType, TransferMode } from '../ui/states/sendTransaction/types'

// Decimals of a Dash amount on Core (duffs) and on Platform (credits).
export const CORE_DASH_DECIMALS = 8
export const PLATFORM_DASH_DECIMALS = 11

const DECIMAL_INPUT = /^\d*\.?\d*$/

// Dash decimals of the layer an endpoint type lives on.
export const endpointDashDecimals = (type: EndpointType): number =>
  type === 'core' ? CORE_DASH_DECIMALS : PLATFORM_DASH_DECIMALS

// Whether a typed amount is a well-formed decimal within the precision.
export const isDashInputAllowed = (input: string, decimals: number): boolean => {
  if (!DECIMAL_INPUT.test(input)) return false
  const fraction = input.split('.')[1] ?? ''
  return fraction.length <= decimals
}

// Dash string to base units (duffs or credits); null for empty, malformed or too precise input.
export const parseDashAmount = (input: string, decimals: number): bigint | null => {
  const value = input.trim()
  if (value === '' || value === '.' || !isDashInputAllowed(value, decimals)) return null
  return toBaseUnit(value, decimals) as bigint
}

// Base units (duffs or credits) as a Dash string with trailing zeros trimmed.
export const formatDashAmount = (baseUnits: bigint, decimals: number): string =>
  fromBaseUnit(baseUnits, decimals)

// USD label for a base-unit amount, or null without a rate.
export const dashAmountToUsd = (baseUnits: bigint | null, decimals: number, rate: number | null): string | null => {
  if (baseUnits == null || rate == null) return null
  return `~ $${(Number(fromBaseUnit(baseUnits, decimals)) * rate).toFixed(2)}`
}

export interface TransferAmountLimits {
  min: bigint
  max: bigint | null
}

const WITHDRAWAL_MODES: TransferMode[] = ['identityWithdraw', 'withdraw', 'shieldedWithdraw']
const ASSET_LOCK_MODES: TransferMode[] = ['coreTopUp', 'coreFund', 'coreShield']

// Whether the mode locks a Core payment on L1 to deliver it on Platform.
export const isAssetLockMode = (mode: TransferMode | null | undefined): boolean =>
  mode != null && ASSET_LOCK_MODES.includes(mode)

// What an asset lock delivers on Platform: the Core payment minus the relay fee kept on L1.
export const assetLockReceived = (paymentDuffs: bigint): bigint => paymentDuffs - MIN_FEE_RELAY

// Fee in duffs a shield from Core pays into the pool out of the locked amount.
export const SHIELD_DEPOSIT_FEE_DUFFS = computeShieldedDepositFee() / CREDITS_PER_DUFF

// Smallest Core payment a shield from Core accepts: it must exceed the relay and shield fees.
const MIN_CORE_SHIELD_DUFFS = MIN_FEE_RELAY + SHIELD_DEPOSIT_FEE_DUFFS + 1n

// Core payment that delivers `lockedDuffs`: the lock plus the relay fee kept on L1.
export const assetLockPayment = (lockedDuffs: bigint): bigint => lockedDuffs + MIN_FEE_RELAY

// Fee amount when it is paid in the same base units as the transfer, else 0n for a fee paid on the other layer.
export const feeOnLayer = (fee: { amount: bigint, decimals: number } | null, decimals: number): bigint =>
  fee != null && fee.decimals === decimals ? fee.amount : 0n

// Allowed amount range of a transfer mode in source base units: duffs for Core, credits for Platform, token units for tokens.
export const transferAmountLimits = (mode: TransferMode): TransferAmountLimits => {
  if (mode === 'coreShield') return { min: MIN_CORE_SHIELD_DUFFS > MIN_TOPUP_FUNDING_DUFFS ? MIN_CORE_SHIELD_DUFFS : MIN_TOPUP_FUNDING_DUFFS, max: null }
  if (ASSET_LOCK_MODES.includes(mode)) return { min: MIN_TOPUP_FUNDING_DUFFS, max: null }
  if (mode === 'coreSend') return { min: CORE_DUST_THRESHOLD + 1n, max: null }
  if (WITHDRAWAL_MODES.includes(mode)) return { min: MIN_WITHDRAWAL_CREDITS, max: MAX_WITHDRAWAL_CREDITS }
  if (mode === 'creditTransfer') return { min: MIN_CREDIT_TRANSFER, max: null }
  if (mode === 'tokenTransfer') return { min: 1n, max: null }
  return { min: MIN_OUTPUT_CREDITS, max: null }
}

// Error for an amount outside the balance or the mode limits, or null when it is fine or empty.
export const validateTransferAmount = (amount: bigint | null, available: bigint | null, limits: TransferAmountLimits, decimals: number, unit: string): string | null => {
  if (amount == null || amount === 0n) return null

  const format = (value: bigint): string => `${formatDashAmount(value, decimals)} ${unit}`

  if (available != null && amount > available) return `Insufficient balance. Maximum is ${format(available > 0n ? available : 0n)}.`
  if (amount < limits.min) return `Minimum amount is ${format(limits.min)}.`
  if (limits.max != null && amount > limits.max) return `Maximum amount is ${format(limits.max)}.`
  return null
}

const USD_DECIMALS = 2
const RATE_SCALE = 1_000_000n

// USD input to Dash base units at the given rate; null for empty or malformed input.
export const usdToDashAmount = (usd: string, rate: number | null, decimals: number): bigint | null => {
  const cents = parseDashAmount(usd, USD_DECIMALS)
  const scaledRate = rate != null ? BigInt(Math.round(rate * Number(RATE_SCALE))) : 0n
  if (cents == null || scaledRate === 0n) return null
  return cents * 10n ** BigInt(decimals) * RATE_SCALE / (10n ** BigInt(USD_DECIMALS) * scaledRate)
}
