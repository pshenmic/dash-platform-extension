import { formatStatNumber } from './formatStatNumber'

describe('formatStatNumber', () => {
  test('keeps short values as is', () => {
    expect(formatStatNumber(0)).toBe('0')
    expect(formatStatNumber(42)).toBe('42')
    expect(formatStatNumber('999')).toBe('999')
    expect(formatStatNumber('1.5')).toBe('1.5')
  })

  test('cuts long fractions to six digits', () => {
    expect(formatStatNumber('0.12345678')).toBe('0.12345')
    expect(formatStatNumber('12.34567891')).toBe('12.3456')
    expect(formatStatNumber('999.99999999')).toBe('999.999')
    expect(formatStatNumber('5.10000009')).toBe('5.1')
  })

  test('shows a bound for tiny non-zero values', () => {
    expect(formatStatNumber('0.00000123')).toBe('<0.00001')
    expect(formatStatNumber('-0.00000123')).toBe('>-0.00001')
    expect(formatStatNumber('0.00001')).toBe('0.00001')
  })

  test('adds a suffix from a thousand up', () => {
    expect(formatStatNumber(1000)).toBe('1K')
    expect(formatStatNumber('12345.67891234')).toBe('12.34K')
    expect(formatStatNumber('21000000.5')).toBe('21M')
    expect(formatStatNumber(1234567890)).toBe('1.23B')
  })

  test('keeps the sign', () => {
    expect(formatStatNumber('-12.3456789')).toBe('-12.3456')
    expect(formatStatNumber('-1500')).toBe('-1.5K')
  })

  test('returns non-numeric placeholders untouched', () => {
    expect(formatStatNumber('-')).toBe('-')
    expect(formatStatNumber('...')).toBe('...')
  })
})
