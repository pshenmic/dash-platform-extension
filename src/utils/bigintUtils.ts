/**
 * Utility functions for working with large numbers including bigint and fractional values
 */

/**
 * Convert a string or bigint to a decimal number with specified decimals
 * @param value - The value to convert (string or bigint)
 * @param decimals - Number of decimal places (default 0 for no decimals)
 * @returns The decimal representation as a string
 */
export function fromBaseUnit (value: string | bigint, decimals: number = 0): string {
  const stringValue = typeof value === 'bigint' ? value.toString() : value

  if (decimals === 0) {
    return stringValue
  }

  const isNegative = stringValue.startsWith('-')
  const absoluteValue = isNegative ? stringValue.slice(1) : stringValue

  const paddedValue = absoluteValue.padStart(decimals + 1, '0')
  const integerPartRaw = paddedValue.slice(0, -decimals)
  const integerPart = integerPartRaw !== '' ? integerPartRaw : '0'
  const fractionalPart = paddedValue.slice(-decimals)

  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalPart.replace(/0+$/, '')

  if (trimmedFractional.length === 0) {
    return (isNegative ? '-' : '') + integerPart
  }

  return (isNegative ? '-' : '') + integerPart + '.' + trimmedFractional
}

/**
 * Convert a decimal string to base unit (bigint or string)
 * @param value - The decimal value as string
 * @param decimals - Number of decimal places
 * @param returnBigInt - Whether to return bigint (default) or string
 * @returns The base unit value
 */
export function toBaseUnit (value: string, decimals: number = 0, returnBigInt: boolean = true): bigint | string {
  const stringValue = value.trim()

  if (decimals === 0) {
    const [result = ''] = stringValue.split('.') // Remove any decimal part
    return returnBigInt ? BigInt(result) : result
  }

  const isNegative = stringValue.startsWith('-')
  const absoluteValue = isNegative ? stringValue.slice(1) : stringValue

  const [integerPart = '0', fractionalPart = ''] = absoluteValue.split('.')

  // Pad or trim fractional part to match decimals
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals)

  const combinedValue = integerPart + paddedFractional
  const result = (isNegative ? '-' : '') + combinedValue

  return returnBigInt ? BigInt(result) : result
}

/**
 * Parse user input (decimal string) and validate it
 * @param input - User input string
 * @param decimals - Maximum allowed decimal places
 * @returns Validated and formatted string, or null if invalid
 */
export function parseDecimalInput (input: string, decimals: number = 0): string | null {
  // Remove non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '')

  // Check for multiple decimal points
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return null
  }

  // Validate decimal places
  if (parts.length === 2 && parts[1].length > decimals) {
    // Trim to max decimals
    return parts[0] + '.' + parts[1].slice(0, decimals)
  }

  return cleaned
}

/**
 * Convert credits to dash (specific utility for this project)
 */
export function creditsToDashBigInt (credits: string | bigint): string {
  const creditsBigInt = typeof credits === 'bigint' ? credits : BigInt(credits)
  // 1 DASH = 100,000,000,000 credits (10^11)
  const dashValue = Number(creditsBigInt) / 1e11
  return dashValue.toFixed(8)
}

/**
 * Convert dash to credits (specific utility for this project)
 */
export function dashToCreditsBigInt (dash: string | number): bigint {
  const dashValue = typeof dash === 'string' ? Number(dash) : dash
  // 1 DASH = 100,000,000,000 credits (10^11)
  return BigInt(Math.floor(dashValue * 1e11))
}

/**
 * Multiply a bigint by a percentage (0-1 range)
 * @param value - The bigint value to multiply
 * @param percentage - The percentage as a decimal (0.5 for 50%, 1 for 100%)
 * @returns The result as bigint (rounded down)
 */
export function multiplyBigIntByPercentage (value: bigint, percentage: number): bigint {
  if (percentage <= 0) return 0n
  if (percentage >= 1) return value

  // Convert percentage to integer ratio to avoid floating point
  // Multiply by 10000 to handle 4 decimal places precision (e.g., 0.5 -> 5000, 0.25 -> 2500)
  const percentageInt = Math.floor(percentage * 10000)
  const result = (value * BigInt(percentageInt)) / 10000n

  return result
}
