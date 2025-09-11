/**
 * Formats large numbers into human-readable format (1500000 → "1.5M")
 * Supports BigInt and strings with decimal parts
 *
 * @param input - Number in BigInt or string format
 * @param precision - Number of decimal places (default 2)
 * @returns Formatted string
 */
export default function formatBigNumber (input: bigint | string, precision: number = 2): string {
  // Convert input data to string
  const numStr = typeof input === 'bigint' ? input.toString() : input

  // Check input data validity
  if (numStr.length === 0 || numStr.trim() === '') {
    return '0'
  }

  // Remove extra spaces
  const cleanStr = numStr.trim()

  // Check if the cleaned string is NOT a valid number format (integer or decimal)
  if (!/^-?\d+(\.\d+)?$/.test(cleanStr)) {
    return '-'
  }

  // Split into sign, integer and fractional parts
  const isNegative = cleanStr.startsWith('-')
  const absoluteStr = isNegative ? cleanStr.slice(1) : cleanStr
  const [intPart, fracPart = ''] = absoluteStr.split('.')

  // Suffixes for large numbers
  const suffixes = ['', 'K', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y']

  // If number is less than 1000, return as is
  if (intPart.length <= 3) {
    return cleanStr
  }

  // Calculate suffix index (every 3 digits = new suffix)
  // If number is too large for our suffixes, use the last available one
  const suffixIndex = Math.min(
    Math.floor((intPart.length - 1) / 3),
    suffixes.length - 1
  )

  // Determine how many digits to show before decimal point
  const actualSuffixIndex = Math.floor((intPart.length - 1) / 3)
  let digitsBeforeDecimal: number

  if (actualSuffixIndex < suffixes.length - 1) {
    // Normal case: 1-3 digits depending on position in suffix range
    digitsBeforeDecimal = ((intPart.length - 1) % 3) + 1
  } else {
    // Number is too large even for the last suffix - Show all excess digits
    digitsBeforeDecimal = intPart.length - ((suffixes.length - 1) * 3 + 1) // How many digits beyond maximum Y range (25 digits)
  }

  const mainDigits = intPart.slice(0, digitsBeforeDecimal)

  // Collect digits for fractional part from remaining integer digits and fractional part
  let remainingDigits = intPart.slice(digitsBeforeDecimal)
  if (fracPart.length > 0) {
    remainingDigits += fracPart
  }

  // Form the result
  let result = mainDigits

  // Add fractional part if needed and there are digits
  if (precision > 0 && remainingDigits.length > 0) {
    const decimalPart = remainingDigits.slice(0, precision).padEnd(precision, '0')

    // Remove trailing zeros
    const trimmedDecimal = decimalPart.replace(/0+$/, '')

    if (trimmedDecimal.length > 0) {
      result += '.' + trimmedDecimal
    }
  }

  // Add sign and suffix
  const sign = isNegative ? '-' : ''
  return sign + result + suffixes[suffixIndex]
}
