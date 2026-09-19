import { fromBaseUnit } from './bigintUtils'

// 1 duff (10^8) is 1000 credits (10^11).
const CREDITS_PER_DUFF = 1000n

export interface DashParts {
  whole: string
  fraction: string
}

/** Credits expressed in duffs, so Core and Platform amounts can be added. */
export function creditsToDuffs (credits: bigint): bigint {
  return credits / CREDITS_PER_DUFF
}

/** Split a duffs amount into the whole and fraction parts the balance UI renders. */
export function duffsToDashParts (duffs: bigint): DashParts {
  const [whole = '0', fraction = ''] = fromBaseUnit(duffs, 8).split('.')
  return { whole, fraction: fraction.padEnd(2, '0') }
}

/** Fiat label for a duffs amount, null while the rate is unknown. */
export function duffsToFiatLabel (duffs: bigint, rate: number | null): string | null {
  if (rate == null) return null
  return `~ $${(Number(fromBaseUnit(duffs, 8)) * rate).toFixed(2)} USD`
}
