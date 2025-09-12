import formatBigNumber from './formatBigNumber'

describe('formatBigNumber', () => {
  describe('Basic functionality', () => {
    test('should handle numbers less than 1000', () => {
      expect(formatBigNumber('0')).toBe('0')
      expect(formatBigNumber('123')).toBe('123')
      expect(formatBigNumber('12.34')).toBe('12.34')
      expect(formatBigNumber('12.3')).toBe('12.3')
      expect(formatBigNumber('999')).toBe('999')
      expect(formatBigNumber('-500')).toBe('-500')
    })

    test('should handle invalid inputs', () => {
      expect(formatBigNumber('')).toBe('0')
      expect(formatBigNumber('   ')).toBe('0')
      expect(formatBigNumber('abc')).toBe('-')
      expect(formatBigNumber('12.34.56')).toBe('-')
      expect(formatBigNumber('.123')).toBe('-')
      expect(formatBigNumber('123.')).toBe('-')
    })
  })

  describe('String inputs', () => {
    test('should format integers with suffixes', () => {
      expect(formatBigNumber('1000')).toBe('1K')
      expect(formatBigNumber('1500')).toBe('1.5K')
      expect(formatBigNumber('12345')).toBe('12.34K')
      expect(formatBigNumber('123456')).toBe('123.45K')
      expect(formatBigNumber('1234567')).toBe('1.23M')
      expect(formatBigNumber('12345678')).toBe('12.34M')
      expect(formatBigNumber('123456789')).toBe('123.45M')
      expect(formatBigNumber('1234567890')).toBe('1.23B')
    })

    test('should format negative numbers', () => {
      expect(formatBigNumber('-1500')).toBe('-1.5K')
      expect(formatBigNumber('-1234567')).toBe('-1.23M')
      expect(formatBigNumber('-1234567890')).toBe('-1.23B')
    })

    test('should format decimal numbers', () => {
      expect(formatBigNumber('1500.789')).toBe('1.5K')
      expect(formatBigNumber('1234567.123456')).toBe('1.23M')
      expect(formatBigNumber('999999.999')).toBe('999.99K')
    })
  })

  describe('BigInt inputs', () => {
    test('should format BigInt numbers', () => {
      expect(formatBigNumber(BigInt('1500'))).toBe('1.5K')
      expect(formatBigNumber(BigInt('1234567'))).toBe('1.23M')
      expect(formatBigNumber(BigInt('1234567890'))).toBe('1.23B')
      expect(formatBigNumber(BigInt('9007199254740991'))).toBe('9P')
    })

    test('should handle very large BigInt numbers', () => {
      expect(formatBigNumber(BigInt('123456789012345678901'))).toBe('123.45E')
      expect(formatBigNumber(BigInt('123456789012345678901234'))).toBe('123.45Z')
    })
  })

  describe('All suffix ranges', () => {
    test('should use correct suffixes for each range', () => {
      // K (thousands): 1,000 - 999,999
      expect(formatBigNumber('1000')).toBe('1K')
      expect(formatBigNumber('999999')).toBe('999.99K')

      // M (millions): 1,000,000 - 999,999,999
      expect(formatBigNumber('1000000')).toBe('1M')
      expect(formatBigNumber('999999999')).toBe('999.99M')

      // B (billions): 1,000,000,000 - 999,999,999,999
      expect(formatBigNumber('1000000000')).toBe('1B')
      expect(formatBigNumber('999999999999')).toBe('999.99B')

      // T (trillions): 1,000,000,000,000 - 999,999,999,999,999
      expect(formatBigNumber('1000000000000')).toBe('1T')
      expect(formatBigNumber('999999999999999')).toBe('999.99T')

      // P (petabytes): 1,000,000,000,000,000 - 999,999,999,999,999,999
      expect(formatBigNumber('1000000000000000')).toBe('1P')
      expect(formatBigNumber('999999999999999999')).toBe('999.99P')

      // E (exabytes): 1,000,000,000,000,000,000 - 999,999,999,999,999,999,999
      expect(formatBigNumber('1000000000000000000')).toBe('1E')
      expect(formatBigNumber('999999999999999999999')).toBe('999.99E')

      // Z (zettabytes): 1,000,000,000,000,000,000,000 - 999,999,999,999,999,999,999,999
      expect(formatBigNumber('1000000000000000000000')).toBe('1Z')
      expect(formatBigNumber('999999999999999999999999')).toBe('999.99Z')

      // Y (yottabytes): 1,000,000,000,000,000,000,000,000+
      expect(formatBigNumber('1000000000000000000000000')).toBe('.1Y')
    })
  })

  describe('Precision parameter', () => {
    test('should respect precision parameter', () => {
      expect(formatBigNumber('1234567', 0)).toBe('1M')
      expect(formatBigNumber('1234567', 1)).toBe('1.2M')
      expect(formatBigNumber('1234567', 2)).toBe('1.23M')
      expect(formatBigNumber('1234567', 3)).toBe('1.234M')
      expect(formatBigNumber('1234567', 4)).toBe('1.2345M')
    })

    test('should handle precision with decimal inputs', () => {
      expect(formatBigNumber('1234567.89', 0)).toBe('1M')
      expect(formatBigNumber('1234567.89', 1)).toBe('1.2M')
      expect(formatBigNumber('1234567.89', 2)).toBe('1.23M')
      expect(formatBigNumber('1234567.89', 3)).toBe('1.234M')
    })

    test('should remove trailing zeros', () => {
      expect(formatBigNumber('1200000', 2)).toBe('1.2M')
      expect(formatBigNumber('1000000', 3)).toBe('1M')
      expect(formatBigNumber('1500000', 1)).toBe('1.5M')
    })
  })

  describe('Numbers exceeding maximum suffix', () => {
    test('should handle numbers larger than 999Y', () => {
      // Numbers with more than 25 digits (beyond Y range)
      const veryLargeNumber = '1000000000000000000000000000' // 28 digits
      expect(formatBigNumber(veryLargeNumber)).toBe('100Y')

      const evenLargerNumber = '123456789012345678901234567890' // 30 digits
      expect(formatBigNumber(evenLargerNumber)).toBe('12345.67Y')

      const extremeNumber = '999999999999999999999999999999999' // 33 digits
      expect(formatBigNumber(extremeNumber)).toBe('99999999.99Y')
    })

    test('should handle BigInt numbers exceeding Y suffix', () => {
      const hugeBigInt = BigInt('123456789012345678901234567890123456')
      expect(formatBigNumber(hugeBigInt)).toBe('12345678901.23Y')
    })

    test('should maintain precision for oversized numbers', () => {
      const largeNumber = '123456789012345678901234567890'
      expect(formatBigNumber(largeNumber, 0)).toBe('12345Y')
      expect(formatBigNumber(largeNumber, 1)).toBe('12345.6Y')
      expect(formatBigNumber(largeNumber, 3)).toBe('12345.678Y')
    })
  })

  describe('Edge cases', () => {
    test('should handle boundary values correctly', () => {
      expect(formatBigNumber('999')).toBe('999')
      expect(formatBigNumber('1000')).toBe('1K')
      expect(formatBigNumber('999999')).toBe('999.99K')
      expect(formatBigNumber('1000000')).toBe('1M')
    })

    test('should handle numbers with many decimal places', () => {
      expect(formatBigNumber('1234567.123456789012345', 5)).toBe('1.23456M')
      expect(formatBigNumber('1000.999999', 2)).toBe('1K')
    })

    test('should handle negative numbers with decimals', () => {
      expect(formatBigNumber('-1234567.89', 2)).toBe('-1.23M')
      expect(formatBigNumber('-999999.99', 1)).toBe('-999.9K')
    })
  })
})
