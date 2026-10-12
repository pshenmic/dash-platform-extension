import formatBigNumber from './formatBigNumber'

/** Digits a stat value keeps before it is shortened. */
const MAX_DIGITS = 6

/** Short form of a number for a stat tile: K/M/B from 1000 up, otherwise cut to MAX_DIGITS digits. */
export function formatStatNumber (value: string | number): string {
  const text = String(value).trim()
  if (!/^-?\d+(\.\d+)?$/.test(text)) return text

  const isNegative = text.startsWith('-')
  const [whole, fraction = ''] = (isNegative ? text.slice(1) : text).split('.')

  if (whole.length > 3) return formatBigNumber(text, 2)

  const fractionDigits = Math.max(0, MAX_DIGITS - whole.length)
  const cut = fraction.slice(0, fractionDigits).replace(/0+$/, '')
  const sign = isNegative ? '-' : ''

  if (whole === '0' && cut === '' && /[1-9]/.test(fraction)) {
    return `${isNegative ? '>-' : '<'}0.${'0'.repeat(fractionDigits - 1)}1`
  }

  return cut === '' ? `${sign}${whole}` : `${sign}${whole}.${cut}`
}
