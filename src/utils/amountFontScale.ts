/** Digits an amount can show before the fraction starts shrinking. */
const FULL_SIZE_DIGITS = 4
/** Font scale removed per digit over the threshold. */
const SCALE_STEP = 0.07
/** Fraction never drops below this share of the whole part size. */
const MIN_SCALE = 0.6

const countDigits = (value: string): number => value.replace(/\D/g, '').length

/**
 * Font scale for the fraction part of an amount, so long numbers stay narrow.
 * Returns 1 while the amount is short enough to render at full size.
 */
export function amountFractionScale (whole: string, fraction: string): number {
  const digits = countDigits(whole) + countDigits(fraction)

  if (digits <= FULL_SIZE_DIGITS) return 1

  return Math.max(MIN_SCALE, 1 - (digits - FULL_SIZE_DIGITS) * SCALE_STEP)
}
