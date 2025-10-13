import {
  fromBaseUnit,
  toBaseUnit,
  bigintAdd,
  bigintSubtract,
  bigintMultiply,
  bigintDivide,
  bigintCompare,
  bigintGreaterThan,
  bigintLessThan,
  bigintGreaterThanOrEqual,
  bigintLessThanOrEqual,
  bigintPercentage,
  formatBigintForDisplay,
  parseDecimalInput,
  creditsToDashBigInt,
  dashToCreditsBigInt
} from './bigintUtils'

describe('bigintUtils', () => {
  describe('fromBaseUnit', () => {
    it('should convert base unit to decimal with 0 decimals', () => {
      expect(fromBaseUnit('12345', 0)).toBe('12345')
      expect(fromBaseUnit(12345n, 0)).toBe('12345')
      expect(fromBaseUnit(12345, 0)).toBe('12345')
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
  })

  describe('toBaseUnit', () => {
    it('should convert decimal to base unit with 0 decimals', () => {
      expect(toBaseUnit('12345', 0)).toBe(12345n)
      expect(toBaseUnit('12345.67', 0)).toBe(12345n)
      expect(toBaseUnit(12345, 0)).toBe(12345n)
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
  })

  describe('bigintAdd', () => {
    it('should add two positive bigints', () => {
      expect(bigintAdd(100n, 200n)).toBe(300n)
      expect(bigintAdd('100', '200')).toBe(300n)
      expect(bigintAdd(100n, '200')).toBe(300n)
    })

    it('should add negative bigints', () => {
      expect(bigintAdd(-100n, -200n)).toBe(-300n)
      expect(bigintAdd('-100', '-200')).toBe(-300n)
    })

    it('should add positive and negative', () => {
      expect(bigintAdd(100n, -50n)).toBe(50n)
      expect(bigintAdd('100', '-150')).toBe(-50n)
    })

    it('should handle zero', () => {
      expect(bigintAdd(0n, 100n)).toBe(100n)
      expect(bigintAdd(100n, 0n)).toBe(100n)
    })

    it('should handle large numbers', () => {
      const large1 = '999999999999999999999999'
      const large2 = '111111111111111111111111'
      expect(bigintAdd(large1, large2)).toBe(1111111111111111111111110n)
    })
  })

  describe('bigintSubtract', () => {
    it('should subtract two positive bigints', () => {
      expect(bigintSubtract(200n, 100n)).toBe(100n)
      expect(bigintSubtract('200', '100')).toBe(100n)
    })

    it('should handle negative results', () => {
      expect(bigintSubtract(100n, 200n)).toBe(-100n)
      expect(bigintSubtract('50', '100')).toBe(-50n)
    })

    it('should subtract negative bigints', () => {
      expect(bigintSubtract(-100n, -200n)).toBe(100n)
      expect(bigintSubtract('-100', '200')).toBe(-300n)
    })

    it('should handle zero', () => {
      expect(bigintSubtract(100n, 0n)).toBe(100n)
      expect(bigintSubtract(0n, 100n)).toBe(-100n)
      expect(bigintSubtract(100n, 100n)).toBe(0n)
    })
  })

  describe('bigintMultiply', () => {
    it('should multiply two positive bigints', () => {
      expect(bigintMultiply(10n, 20n)).toBe(200n)
      expect(bigintMultiply('10', '20')).toBe(200n)
    })

    it('should handle negative multiplication', () => {
      expect(bigintMultiply(-10n, 20n)).toBe(-200n)
      expect(bigintMultiply(10n, -20n)).toBe(-200n)
      expect(bigintMultiply(-10n, -20n)).toBe(200n)
    })

    it('should handle zero', () => {
      expect(bigintMultiply(0n, 100n)).toBe(0n)
      expect(bigintMultiply(100n, 0n)).toBe(0n)
    })

    it('should handle large numbers', () => {
      expect(bigintMultiply('999999999999', '888888888888')).toBe(888888888887111111111112n)
    })
  })

  describe('bigintDivide', () => {
    it('should divide two positive bigints', () => {
      expect(bigintDivide(200n, 10n)).toBe(20n)
      expect(bigintDivide('200', '10')).toBe(20n)
    })

    it('should handle integer division', () => {
      expect(bigintDivide(100n, 3n)).toBe(33n)
      expect(bigintDivide(10n, 3n)).toBe(3n)
    })

    it('should handle negative division', () => {
      expect(bigintDivide(-200n, 10n)).toBe(-20n)
      expect(bigintDivide(200n, -10n)).toBe(-20n)
      expect(bigintDivide(-200n, -10n)).toBe(20n)
    })

    it('should handle division resulting in zero', () => {
      expect(bigintDivide(5n, 10n)).toBe(0n)
    })
  })

  describe('bigintCompare', () => {
    it('should return -1 when a < b', () => {
      expect(bigintCompare(100n, 200n)).toBe(-1)
      expect(bigintCompare('100', '200')).toBe(-1)
      expect(bigintCompare(-200n, -100n)).toBe(-1)
    })

    it('should return 0 when a === b', () => {
      expect(bigintCompare(100n, 100n)).toBe(0)
      expect(bigintCompare('100', '100')).toBe(0)
      expect(bigintCompare(0n, 0n)).toBe(0)
    })

    it('should return 1 when a > b', () => {
      expect(bigintCompare(200n, 100n)).toBe(1)
      expect(bigintCompare('200', '100')).toBe(1)
      expect(bigintCompare(-100n, -200n)).toBe(1)
    })

    it('should handle negative comparisons', () => {
      expect(bigintCompare(-100n, 100n)).toBe(-1)
      expect(bigintCompare(100n, -100n)).toBe(1)
    })
  })

  describe('bigintGreaterThan', () => {
    it('should return true when a > b', () => {
      expect(bigintGreaterThan(200n, 100n)).toBe(true)
      expect(bigintGreaterThan('200', '100')).toBe(true)
    })

    it('should return false when a <= b', () => {
      expect(bigintGreaterThan(100n, 200n)).toBe(false)
      expect(bigintGreaterThan(100n, 100n)).toBe(false)
    })
  })

  describe('bigintLessThan', () => {
    it('should return true when a < b', () => {
      expect(bigintLessThan(100n, 200n)).toBe(true)
      expect(bigintLessThan('100', '200')).toBe(true)
    })

    it('should return false when a >= b', () => {
      expect(bigintLessThan(200n, 100n)).toBe(false)
      expect(bigintLessThan(100n, 100n)).toBe(false)
    })
  })

  describe('bigintGreaterThanOrEqual', () => {
    it('should return true when a >= b', () => {
      expect(bigintGreaterThanOrEqual(200n, 100n)).toBe(true)
      expect(bigintGreaterThanOrEqual(100n, 100n)).toBe(true)
    })

    it('should return false when a < b', () => {
      expect(bigintGreaterThanOrEqual(100n, 200n)).toBe(false)
    })
  })

  describe('bigintLessThanOrEqual', () => {
    it('should return true when a <= b', () => {
      expect(bigintLessThanOrEqual(100n, 200n)).toBe(true)
      expect(bigintLessThanOrEqual(100n, 100n)).toBe(true)
    })

    it('should return false when a > b', () => {
      expect(bigintLessThanOrEqual(200n, 100n)).toBe(false)
    })
  })

  describe('bigintPercentage', () => {
    it('should calculate percentage with 0 decimals', () => {
      expect(bigintPercentage(1000n, 0.1)).toBe(100n)
      expect(bigintPercentage('1000', 0.5)).toBe(500n)
      expect(bigintPercentage(1000n, 1)).toBe(1000n)
    })

    it('should calculate percentage with decimals', () => {
      expect(bigintPercentage('100000000', 0.1, 8)).toBe(10000000n)
      expect(bigintPercentage('100000000', 0.5, 8)).toBe(50000000n)
    })

    it('should handle small percentages', () => {
      expect(bigintPercentage(1000n, 0.01)).toBe(10n)
      expect(bigintPercentage(1000n, 0.001)).toBe(1n)
    })

    it('should handle zero percentage', () => {
      expect(bigintPercentage(1000n, 0)).toBe(0n)
    })

    it('should floor the result', () => {
      expect(bigintPercentage(999n, 0.1)).toBe(99n)
      expect(bigintPercentage(100n, 0.15)).toBe(15n)
    })
  })

  describe('formatBigintForDisplay', () => {
    it('should format with default display decimals', () => {
      expect(formatBigintForDisplay('12345', 2)).toBe('123.45')
      expect(formatBigintForDisplay('100000000', 8)).toBe('1')
    })

    it('should format with custom display decimals', () => {
      expect(formatBigintForDisplay('12345', 2, 2)).toBe('123.45')
      expect(formatBigintForDisplay('12345', 2, 3)).toBe('123.450')
      expect(formatBigintForDisplay('12345', 2, 1)).toBe('123.5')
    })

    it('should handle rounding', () => {
      expect(formatBigintForDisplay('12346', 2, 1)).toBe('123.5')
      expect(formatBigintForDisplay('12344', 2, 1)).toBe('123.4')
    })

    it('should handle zero decimals', () => {
      expect(formatBigintForDisplay('12345', 0)).toBe('12345')
      expect(formatBigintForDisplay('12345', 0, 2)).toBe('12345.00')
    })

    it('should handle bigint input', () => {
      expect(formatBigintForDisplay(12345n, 2, 2)).toBe('123.45')
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

  describe('edge cases and error handling', () => {
    it('should handle very large numbers', () => {
      const large = '999999999999999999999999999999'
      expect(fromBaseUnit(large, 8)).toMatch(/^\d+\.?\d*$/)
      expect(() => bigintAdd(large, large)).not.toThrow()
    })

    it('should handle negative zero', () => {
      expect(fromBaseUnit('-0', 8)).toBe('-0')
      expect(toBaseUnit('-0', 8)).toBe(0n)
    })

    it('should handle leading zeros', () => {
      expect(parseDecimalInput('00123.45', 2)).toBe('00123.45')
      expect(toBaseUnit('00123.45', 2)).toBe(12345n)
    })
  })
})
