import {
  fromBaseUnit,
  toBaseUnit,
  parseDecimalInput,
  creditsToDashBigInt,
  dashToCreditsBigInt,
  multiplyBigIntByPercentage
} from './bigintUtils'

describe('bigintUtils', () => {
  describe('fromBaseUnit', () => {
    it('should convert base unit to decimal with 0 decimals', () => {
      expect(fromBaseUnit('12345', 0)).toBe('12345')
      expect(fromBaseUnit(12345n, 0)).toBe('12345')
    })

    it('should convert base unit to decimal with decimals', () => {
      expect(fromBaseUnit('12345', 2)).toBe('123.45')
      expect(fromBaseUnit('100000000', 8)).toBe('1')
      expect(fromBaseUnit('123456789', 8)).toBe('1.23456789')
    })

    it('should handle trailing zeros in fractional part', () => {
      expect(fromBaseUnit('100000', 5)).toBe('1')
      expect(fromBaseUnit('120000', 5)).toBe('1.2')
      expect(fromBaseUnit('123000', 5)).toBe('1.23')
    })

    it('should handle small values with padding', () => {
      expect(fromBaseUnit('1', 8)).toBe('0.00000001')
      expect(fromBaseUnit('10', 8)).toBe('0.0000001')
      expect(fromBaseUnit('100', 3)).toBe('0.1')
    })

    it('should handle negative values', () => {
      expect(fromBaseUnit('-12345', 2)).toBe('-123.45')
      expect(fromBaseUnit(-12345n, 2)).toBe('-123.45')
      expect(fromBaseUnit('-100000000', 8)).toBe('-1')
    })

    it('should handle zero', () => {
      expect(fromBaseUnit('0', 0)).toBe('0')
      expect(fromBaseUnit('0', 8)).toBe('0')
      expect(fromBaseUnit(0n, 5)).toBe('0')
    })

    it('should handle negative zero', () => {
      expect(fromBaseUnit('-0', 8)).toBe('-0')
    })
  })

  describe('toBaseUnit', () => {
    it('should convert decimal to base unit with 0 decimals', () => {
      expect(toBaseUnit('12345', 0)).toBe(12345n)
      expect(toBaseUnit('12345.67', 0)).toBe(12345n)
    })

    it('should convert decimal to base unit with decimals', () => {
      expect(toBaseUnit('123.45', 2)).toBe(12345n)
      expect(toBaseUnit('1', 8)).toBe(100000000n)
      expect(toBaseUnit('1.23456789', 8)).toBe(123456789n)
    })

    it('should pad fractional part if needed', () => {
      expect(toBaseUnit('1.2', 5)).toBe(120000n)
      expect(toBaseUnit('1.23', 5)).toBe(123000n)
      expect(toBaseUnit('1', 8)).toBe(100000000n)
    })

    it('should trim fractional part if exceeds decimals', () => {
      expect(toBaseUnit('1.23456789', 5)).toBe(123456n)
      expect(toBaseUnit('1.999999', 2)).toBe(199n)
    })

    it('should handle negative values', () => {
      expect(toBaseUnit('-123.45', 2)).toBe(-12345n)
      expect(toBaseUnit('-1', 8)).toBe(-100000000n)
    })

    it('should handle zero and empty fractional part', () => {
      expect(toBaseUnit('0', 8)).toBe(0n)
      expect(toBaseUnit('0.0', 8)).toBe(0n)
      expect(toBaseUnit('123', 5)).toBe(12300000n)
    })

    it('should return string when returnBigInt is false', () => {
      expect(toBaseUnit('123.45', 2, false)).toBe('12345')
      expect(toBaseUnit('-123.45', 2, false)).toBe('-12345')
      expect(typeof toBaseUnit('123.45', 2, false)).toBe('string')
    })

    it('should handle whitespace', () => {
      expect(toBaseUnit('  123.45  ', 2)).toBe(12345n)
      expect(toBaseUnit(' 1 ', 8)).toBe(100000000n)
    })

    it('should handle negative zero', () => {
      expect(toBaseUnit('-0', 8)).toBe(0n)
    })

    it('should handle leading zeros', () => {
      expect(toBaseUnit('00123.45', 2)).toBe(12345n)
    })
  })

  describe('parseDecimalInput', () => {
    it('should parse valid decimal input', () => {
      expect(parseDecimalInput('123.45', 2)).toBe('123.45')
      expect(parseDecimalInput('123', 2)).toBe('123')
      expect(parseDecimalInput('0.5', 2)).toBe('0.5')
    })

    it('should remove non-numeric characters', () => {
      expect(parseDecimalInput('$123.45', 2)).toBe('123.45')
      expect(parseDecimalInput('123,456.78', 2)).toBe('123456.78')
      expect(parseDecimalInput('abc123def', 0)).toBe('123')
    })

    it('should handle multiple decimal points', () => {
      expect(parseDecimalInput('123.45.67', 2)).toBeNull()
      expect(parseDecimalInput('1.2.3', 5)).toBeNull()
    })

    it('should trim excess decimal places', () => {
      expect(parseDecimalInput('123.456789', 2)).toBe('123.45')
      expect(parseDecimalInput('1.999999', 4)).toBe('1.9999')
      expect(parseDecimalInput('123.456', 8)).toBe('123.456')
    })

    it('should handle zero decimals', () => {
      expect(parseDecimalInput('123.45', 0)).toBe('123.')
      expect(parseDecimalInput('123', 0)).toBe('123')
    })

    it('should handle empty and invalid input', () => {
      expect(parseDecimalInput('', 2)).toBe('')
      expect(parseDecimalInput('...', 2)).toBeNull()
    })

    it('should preserve single decimal point', () => {
      expect(parseDecimalInput('123.', 2)).toBe('123.')
      expect(parseDecimalInput('.5', 2)).toBe('.5')
    })

    it('should handle leading zeros', () => {
      expect(parseDecimalInput('00123.45', 2)).toBe('00123.45')
    })
  })

  describe('creditsToDashBigInt', () => {
    it('should convert credits to DASH', () => {
      expect(creditsToDashBigInt('100000000000')).toBe('1.00000000')
      expect(creditsToDashBigInt(100000000000n)).toBe('1.00000000')
      expect(creditsToDashBigInt('200000000000')).toBe('2.00000000')
    })

    it('should handle fractional DASH', () => {
      expect(creditsToDashBigInt('50000000000')).toBe('0.50000000')
      expect(creditsToDashBigInt('123456789012')).toBe('1.23456789')
    })

    it('should handle small amounts', () => {
      expect(creditsToDashBigInt('1')).toBe('0.00000000')
      expect(creditsToDashBigInt('100000000')).toBe('0.00100000')
    })

    it('should handle zero', () => {
      expect(creditsToDashBigInt('0')).toBe('0.00000000')
      expect(creditsToDashBigInt(0n)).toBe('0.00000000')
    })

    it('should handle large amounts', () => {
      expect(creditsToDashBigInt('1000000000000000')).toBe('10000.00000000')
    })

    it('should always return 8 decimal places', () => {
      const result = creditsToDashBigInt('100000000000')
      expect(result.split('.')[1]).toHaveLength(8)
    })
  })

  describe('dashToCreditsBigInt', () => {
    it('should convert DASH to credits', () => {
      expect(dashToCreditsBigInt('1')).toBe(100000000000n)
      expect(dashToCreditsBigInt(1)).toBe(100000000000n)
      expect(dashToCreditsBigInt('2')).toBe(200000000000n)
    })

    it('should handle fractional DASH', () => {
      expect(dashToCreditsBigInt('0.5')).toBe(50000000000n)
      expect(dashToCreditsBigInt('1.23456789')).toBe(123456788999n)
    })

    it('should handle small amounts', () => {
      expect(dashToCreditsBigInt('0.001')).toBe(100000000n)
      expect(dashToCreditsBigInt('0.00000001')).toBe(1000n)
    })

    it('should handle zero', () => {
      expect(dashToCreditsBigInt('0')).toBe(0n)
      expect(dashToCreditsBigInt(0)).toBe(0n)
    })

    it('should handle large amounts', () => {
      expect(dashToCreditsBigInt('10000')).toBe(1000000000000000n)
    })

    it('should floor the result', () => {
      expect(dashToCreditsBigInt('0.000000001')).toBe(100n)
      expect(dashToCreditsBigInt('1.999999999999')).toBe(199999999999n)
    })
  })

  describe('credits <-> DASH conversion roundtrip', () => {
    it('should convert back and forth correctly', () => {
      const originalDash = '1.23456789'
      const credits = dashToCreditsBigInt(originalDash)
      const convertedDash = creditsToDashBigInt(credits)
      expect(convertedDash).toBe('1.23456789')
    })

    it('should handle multiple roundtrips', () => {
      let value = '5.5'
      for (let i = 0; i < 10; i++) {
        const credits = dashToCreditsBigInt(value)
        value = creditsToDashBigInt(credits)
      }
      expect(value).toBe('5.50000000')
    })
  })

  describe('multiplyBigIntByPercentage', () => {
    it('should multiply by 100% (1.0)', () => {
      expect(multiplyBigIntByPercentage(1000n, 1.0)).toBe(1000n)
      expect(multiplyBigIntByPercentage(123456789n, 1.0)).toBe(123456789n)
    })

    it('should multiply by 50% (0.5)', () => {
      expect(multiplyBigIntByPercentage(1000n, 0.5)).toBe(500n)
      expect(multiplyBigIntByPercentage(100000n, 0.5)).toBe(50000n)
    })

    it('should multiply by 25% (0.25)', () => {
      expect(multiplyBigIntByPercentage(1000n, 0.25)).toBe(250n)
      expect(multiplyBigIntByPercentage(100000n, 0.25)).toBe(25000n)
    })

    it('should handle 0% (0.0)', () => {
      expect(multiplyBigIntByPercentage(1000n, 0.0)).toBe(0n)
      expect(multiplyBigIntByPercentage(999999n, 0)).toBe(0n)
    })

    it('should handle negative percentages as 0', () => {
      expect(multiplyBigIntByPercentage(1000n, -0.5)).toBe(0n)
      expect(multiplyBigIntByPercentage(1000n, -1)).toBe(0n)
    })

    it('should handle percentages > 1 as 100%', () => {
      expect(multiplyBigIntByPercentage(1000n, 1.5)).toBe(1000n)
      expect(multiplyBigIntByPercentage(1000n, 2.0)).toBe(1000n)
    })

    it('should round down the result', () => {
      expect(multiplyBigIntByPercentage(100n, 0.333)).toBe(33n)
      expect(multiplyBigIntByPercentage(100n, 0.666)).toBe(66n)
      expect(multiplyBigIntByPercentage(1000n, 0.1234)).toBe(123n)
    })

    it('should handle large bigint values', () => {
      const largeValue = 123456789012345678901234567890n
      expect(multiplyBigIntByPercentage(largeValue, 0.5)).toBe(61728394506172839450617283945n)
      expect(multiplyBigIntByPercentage(largeValue, 0.25)).toBe(30864197253086419725308641972n)
    })

    it('should handle small percentages with precision', () => {
      expect(multiplyBigIntByPercentage(1000000n, 0.0001)).toBe(100n)
      expect(multiplyBigIntByPercentage(10000000n, 0.0025)).toBe(25000n)
    })

    it('should handle zero value', () => {
      expect(multiplyBigIntByPercentage(0n, 0.5)).toBe(0n)
      expect(multiplyBigIntByPercentage(0n, 1.0)).toBe(0n)
    })
  })
})
